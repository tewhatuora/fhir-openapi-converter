/*
 * Preloaded into the converter with `node -r` so that every HTTP GET it makes
 * (IG packages, base FHIR schemas from raw.githubusercontent.com, remote $refs
 * pulled in while dereferencing/validating) is served from a shared on-disk
 * cache. The baseline and candidate runs therefore see byte-identical inputs.
 *
 * Covers both global `fetch` (used by the converter itself) and
 * `http.get`/`https.get` (used by @readme/json-schema-ref-parser).
 *
 * Environment:
 *   REGRESSION_CACHE_DIR   cache directory (required to enable the shim)
 *   REGRESSION_CACHE_MODE  "record" (default): serve hits, fetch and store misses
 *                          "offline": serve hits, fail on a miss
 *   REGRESSION_CACHE_LOG   optional file; one JSON line per request is appended
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');

const originalFetch = globalThis.fetch;

const keyFor = (url) => crypto.createHash('sha256').update(url).digest('hex');

const writeAtomic = (file, data) => {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
};

/**
 * Returns getCached(url) => Promise<{ status, statusText, headers, body }>,
 * serving a GET from `dir` when possible. Network errors are not cached;
 * HTTP error statuses are, since they are part of the input.
 */
const createCache = ({ dir, mode = 'record', logFile }) => {
  const entryPaths = (url) => {
    const key = keyFor(url);
    return {
      meta: path.join(dir, `${key}.json`),
      body: path.join(dir, `${key}.body`),
    };
  };

  const log = (record) => {
    if (logFile) fs.appendFileSync(logFile, JSON.stringify(record) + '\n');
  };

  const readEntry = (url) => {
    const { meta, body } = entryPaths(url);
    if (!fs.existsSync(meta) || !fs.existsSync(body)) return null;
    const info = JSON.parse(fs.readFileSync(meta, 'utf8'));
    return { ...info, body: fs.readFileSync(body) };
  };

  // Concurrent requests for the same URL share one download.
  const inflight = new Map();

  return (url) => {
    const hit = readEntry(url);
    if (hit) {
      log({ url, source: 'cache', status: hit.status });
      return Promise.resolve(hit);
    }
    if (mode === 'offline') {
      log({ url, source: 'miss-offline' });
      return Promise.reject(
        new Error(`[regression fetch-cache] offline and not cached: ${url}`)
      );
    }
    if (inflight.has(url)) return inflight.get(url);
    const pending = (async () => {
      let res;
      try {
        res = await originalFetch(url, { redirect: 'follow' });
      } catch (err) {
        log({ url, source: 'network-error', error: String(err) });
        throw err;
      }
      const body = Buffer.from(await res.arrayBuffer());
      const headers = {};
      const contentType = res.headers.get('content-type');
      if (contentType) headers['content-type'] = contentType;
      const entry = {
        url,
        finalUrl: res.url,
        status: res.status,
        statusText: res.statusText,
        headers,
        bytes: body.length,
        sha256: crypto.createHash('sha256').update(body).digest('hex'),
        fetchedAt: new Date().toISOString(),
      };
      fs.mkdirSync(dir, { recursive: true });
      const paths = entryPaths(url);
      writeAtomic(paths.body, body);
      writeAtomic(paths.meta, JSON.stringify(entry, null, 2));
      log({ url, source: 'network', status: res.status });
      return { ...entry, body };
    })();
    inflight.set(url, pending);
    pending.finally(() => inflight.delete(url)).catch(() => {});
    return pending;
  };
};

const isCacheable = (url, method) =>
  /^https?:\/\//.test(url) && (!method || method.toUpperCase() === 'GET');

let getCached;

function cachedFetch(input, init = {}) {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input && input.url;
  const method = init.method || (input && input.method);
  if (!isCacheable(url, method)) return originalFetch(input, init);
  return getCached(url).then(
    (entry) =>
      new Response(
        // Response forbids a body on these statuses.
        [204, 304].includes(entry.status) ? null : entry.body,
        {
          status: entry.status,
          statusText: entry.statusText,
          headers: entry.headers,
        }
      )
  );
}

const optionsToUrl = (protocol, options) => {
  if (typeof options === 'string') return options;
  if (options instanceof URL) return options.href;
  const proto = options.protocol || protocol;
  const host = options.hostname || options.host || 'localhost';
  const port = options.port ? `:${options.port}` : '';
  return `${proto}//${host}${port}${options.path || '/'}`;
};

// Minimal stand-in for http.ClientRequest, enough for http.get() consumers.
const fakeGet = (url, callback) => {
  const req = new EventEmitter();
  req.setTimeout = () => req;
  req.abort = req.destroy = () => req;
  req.end = () => req;
  if (callback) req.once('response', callback);
  getCached(url).then(
    (entry) => {
      const res = new PassThrough();
      res.statusCode = entry.status;
      res.statusMessage = entry.statusText;
      res.headers = { ...entry.headers };
      req.emit('response', res);
      res.end(entry.body);
    },
    (err) => req.emit('error', err)
  );
  return req;
};

const patchGet = (mod, protocol) => {
  const originalGet = mod.get;
  mod.get = function get(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const url = optionsToUrl(protocol, input);
    const merged =
      typeof input === 'object' && !(input instanceof URL) ? input : options;
    if (merged && merged.method && merged.method.toUpperCase() !== 'GET') {
      return originalGet.apply(this, arguments);
    }
    return fakeGet(url, callback);
  };
};

if (process.env.REGRESSION_CACHE_DIR && typeof originalFetch === 'function') {
  getCached = createCache({
    dir: process.env.REGRESSION_CACHE_DIR,
    mode: process.env.REGRESSION_CACHE_MODE,
    logFile: process.env.REGRESSION_CACHE_LOG,
  });
  globalThis.fetch = cachedFetch;
  patchGet(http, 'http:');
  patchGet(https, 'https:');
}

module.exports = { createCache, keyFor };
