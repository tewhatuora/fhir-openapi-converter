// Runs a child process with the shim preloaded against a local HTTP server,
// checking that fetch() and https/http.get() are recorded and then replayed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const SHIM = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'fetch-cache.cjs'
);
const exec = promisify(execFile);

const CLIENT = `
const http = require('http');
const url = process.argv[1];
const viaGet = () => new Promise((resolve, reject) => {
  const req = http.get(new URL(url + '/b'), (res) => {
    let body = '';
    res.on('data', (d) => (body += d));
    res.on('end', () => resolve(res.statusCode + ':' + body));
  });
  req.on('error', reject);
});
(async () => {
  const a = await fetch(url + '/a');
  const missing = await fetch(url + '/missing');
  console.log(JSON.stringify([a.status + ':' + (await a.text()), missing.status, await viaGet()]));
})().catch((e) => { console.log(JSON.stringify({ error: e.message })); });
`;

const runClient = async (url, env) => {
  const { stdout } = await exec(
    process.execPath,
    ['-r', SHIM, '-e', CLIENT, url],
    {
      env: { ...process.env, ...env },
    }
  );
  return JSON.parse(stdout);
};

test('records on first use, then replays without the network', async () => {
  let version = 1;
  let hits = 0;
  const server = http.createServer((req, res) => {
    hits++;
    if (req.url === '/missing') {
      res.writeHead(404);
      return res.end('nope');
    }
    res.end(`${req.url}-v${version}`);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-cache-'));
  const logFile = path.join(dir, 'log.jsonl');
  try {
    const env = {
      REGRESSION_CACHE_DIR: path.join(dir, 'http'),
      REGRESSION_CACHE_LOG: logFile,
    };
    assert.deepEqual(await runClient(url, env), [
      '200:/a-v1',
      404,
      '200:/b-v1',
    ]);
    assert.equal(hits, 3);

    // Upstream changes are not seen: everything comes from the cache.
    version = 2;
    assert.deepEqual(await runClient(url, env), [
      '200:/a-v1',
      404,
      '200:/b-v1',
    ]);
    assert.equal(hits, 3);
    const sources = fs
      .readFileSync(logFile, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l).source);
    assert.deepEqual(sources, [
      'network',
      'network',
      'network',
      'cache',
      'cache',
      'cache',
    ]);

    // Offline mode fails a miss instead of fetching it.
    fs.rmSync(path.join(dir, 'http'), { recursive: true });
    const offline = await runClient(url, {
      ...env,
      REGRESSION_CACHE_MODE: 'offline',
    });
    assert.match(offline.error, /offline and not cached/);
    assert.equal(hits, 3);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
