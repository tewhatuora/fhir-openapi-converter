#!/usr/bin/env node
// Converter regression harness: runs a published release (baseline) and the
// current checkout (candidate) against the IGs in igs.yaml with identical,
// cached network inputs, then reports how the generated OpenAPI differs.
// See README.md in this folder.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import YAML from 'yaml';
import {
  resolveBaseline,
  buildCandidate,
  candidateFromFile,
} from './lib/builds.mjs';
import { runConverter } from './lib/converter.mjs';
import { compareRuns } from './lib/compare.mjs';
import { renderMarkdown, toJson } from './lib/report.mjs';

const require = createRequire(import.meta.url);
const { createCache } = require('./lib/fetch-cache.cjs');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const USAGE = `Usage: node regression/run.mjs [options]

  --baseline <spec>       latest (default; excludes prereleases), newest
                          (includes prereleases), a release tag such as v1.2.4-6,
                          or a path to a cli.js
  --candidate-cli <path>  cli.js produced by the checkout's build
                          (default: dist/cli.js, relative to the repo root)
  --skip-build            use the existing candidate cli.js without yarn build
  --config <file>         IG list (default: regression/igs.yaml)
  --only <ids>            comma-separated IG ids to run
  --out <dir>             output folder (default: regression/out); emptied first
  --cache-dir <dir>       cache folder (default: regression/.cache)
  --refresh               delete the cached network inputs first
  --offline               fail any network request that isn't already cached
  --timeout <seconds>     per converter run (default: 600)
  --repo <owner/name>     GitHub repository for releases
                          (default: tewhatuora/fhir-openapi-converter)
  -h, --help

Exit codes: 0 all IGs match, 1 some IG differs, 2 harness error.`;

const { values: opts } = parseArgs({
  options: {
    baseline: { type: 'string', default: 'latest' },
    'candidate-cli': { type: 'string', default: 'dist/cli.js' },
    'skip-build': { type: 'boolean', default: false },
    config: { type: 'string', default: path.join(HERE, 'igs.yaml') },
    only: { type: 'string' },
    out: { type: 'string', default: path.join(HERE, 'out') },
    'cache-dir': { type: 'string', default: path.join(HERE, '.cache') },
    refresh: { type: 'boolean', default: false },
    offline: { type: 'boolean', default: false },
    timeout: { type: 'string', default: '600' },
    repo: { type: 'string', default: 'tewhatuora/fhir-openapi-converter' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}

const log = (msg) => console.error(`[regression] ${msg}`);

const loadConfig = (file) => {
  const config = YAML.parse(fs.readFileSync(file, 'utf8'));
  const igs = config?.igs;
  if (!Array.isArray(igs))
    throw new Error(`${file}: expected a top-level "igs" list`);
  const seen = new Set();
  for (const ig of igs) {
    if (!ig.id || !/^[A-Za-z0-9._-]+$/.test(ig.id)) {
      throw new Error(
        `${file}: every IG needs an id made of letters, digits, ".", "_" or "-" (got ${JSON.stringify(ig.id)})`
      );
    }
    if (seen.has(ig.id)) throw new Error(`${file}: duplicate IG id ${ig.id}`);
    seen.add(ig.id);
    if (Boolean(ig.packageUrl) === Boolean(ig.inputFolder)) {
      throw new Error(
        `${file}: IG ${ig.id} needs exactly one of packageUrl or inputFolder`
      );
    }
    if (ig.inputFolder && ig.dependencyUrls?.length) {
      throw new Error(
        `${file}: IG ${ig.id}: dependencyUrls only apply to packageUrl entries (the converter ignores them with --inputFolder)`
      );
    }
  }
  return igs;
};

const main = async () => {
  const configPath = path.resolve(opts.config);
  const allIgs = loadConfig(configPath);
  const only = opts.only ? opts.only.split(',').map((s) => s.trim()) : null;
  if (only) {
    const unknown = only.filter((id) => !allIgs.some((ig) => ig.id === id));
    if (unknown.length)
      throw new Error(`Unknown IG id(s) in --only: ${unknown.join(', ')}`);
  }
  const igs = allIgs.filter(
    (ig) => !ig.skip && (!only || only.includes(ig.id))
  );
  const skipped = allIgs.filter((ig) => !igs.includes(ig)).map((ig) => ig.id);

  const cacheRoot = path.resolve(opts['cache-dir']);
  const httpCache = path.join(cacheRoot, 'http');
  const cacheMode = opts.offline ? 'offline' : 'record';
  if (opts.refresh) {
    log(`Deleting cached network inputs in ${httpCache}`);
    fs.rmSync(httpCache, { recursive: true, force: true });
  }

  const outDir = path.resolve(opts.out);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const baseline = await resolveBaseline({
    spec: opts.baseline,
    repo: opts.repo,
    cacheDir: path.join(cacheRoot, 'releases'),
    log,
  });
  log(`Baseline: ${baseline.label} (${baseline.cli})`);

  const candidate = opts['skip-build']
    ? candidateFromFile(
        path.resolve(REPO_ROOT, opts['candidate-cli']),
        REPO_ROOT
      )
    : buildCandidate({
        repoRoot: REPO_ROOT,
        cliPath: opts['candidate-cli'],
        log,
      });
  log(`Candidate: ${candidate.label} (${candidate.cli})`);

  // Download every IG package once, before either build runs, so both see
  // the same bytes. The converter's own requests then hit this cache.
  const getCached = createCache({ dir: httpCache, mode: cacheMode });
  const timeoutMs = Number(opts.timeout) * 1000;
  const results = [];
  for (const ig of igs) {
    log(`IG ${ig.id}`);
    const result = {
      id: ig.id,
      description: ig.description,
      packageUrl: ig.packageUrl,
      inputFolder: ig.inputFolder,
      dependencyUrls: ig.dependencyUrls,
      options: ig.options,
      warnings: [],
    };
    try {
      for (const url of [ig.packageUrl, ...(ig.dependencyUrls || [])].filter(
        Boolean
      )) {
        const entry = await getCached(url);
        if (entry.status !== 200) {
          result.warnings.push(
            `${url} returned HTTP ${entry.status}; both builds were given that response.`
          );
        }
      }
      if (
        ig.inputFolder &&
        !fs.existsSync(path.resolve(REPO_ROOT, ig.inputFolder))
      ) {
        throw new Error(`inputFolder ${ig.inputFolder} does not exist`);
      }
      // Baseline first: any schema it fetches is cached before the candidate runs.
      const runs = {};
      for (const side of ['baseline', 'candidate']) {
        const build = side === 'baseline' ? baseline : candidate;
        runs[side] = await runConverter({
          cli: build.cli,
          ig,
          repoRoot: REPO_ROOT,
          workDir: path.join(outDir, 'runs', ig.id, side),
          cacheDir: httpCache,
          cacheMode,
          timeoutMs,
        });
        const r = runs[side];
        log(
          `  ${side}: exit ${r.exitCode ?? r.signal}, ${r.files.length} files, ${(r.durationMs / 1000).toFixed(1)}s`
        );
        if (r.timedOut || r.spawnError) {
          throw new Error(
            `${side} run ${r.timedOut ? `timed out after ${opts.timeout}s` : `failed to start: ${r.spawnError}`}`
          );
        }
      }
      const candidateOnlyUrls = runs.candidate.network.urls.filter(
        (u) => !runs.baseline.network.urls.includes(u)
      );
      if (candidateOnlyUrls.length) {
        result.warnings.push(
          `The candidate requested ${candidateOnlyUrls.length} URL(s) the baseline did not, e.g. ${candidateOnlyUrls[0]}`
        );
      }
      result.comparison = compareRuns(runs.baseline, runs.candidate);
      result.status = result.comparison.status;
      for (const side of ['baseline', 'candidate']) {
        const { dir, outputDir, ...rest } = runs[side];
        result[side] = {
          ...rest,
          dir: path.relative(outDir, dir),
          network: { ...rest.network, urls: rest.network.urls.length },
        };
      }
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
    }
    log(`  => ${result.status}`);
    results.push(result);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    config: path.relative(REPO_ROOT, configPath),
    baseline,
    candidate,
    cache: {
      dir: path.relative(REPO_ROOT, httpCache),
      mode: cacheMode,
      entries: fs.existsSync(httpCache)
        ? fs.readdirSync(httpCache).filter((f) => f.endsWith('.json')).length
        : 0,
    },
    skipped,
    igs: results,
  };
  for (const build of [report.baseline, report.candidate]) {
    const rel = path.relative(REPO_ROOT, build.cli);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) build.cli = rel;
  }
  report.summary = {
    match: results.filter((r) => r.status === 'match').map((r) => r.id),
    differ: results.filter((r) => r.status === 'differ').map((r) => r.id),
    error: results.filter((r) => r.status === 'error').map((r) => r.id),
  };

  const markdown = renderMarkdown(report);
  fs.writeFileSync(path.join(outDir, 'report.md'), markdown);
  fs.writeFileSync(path.join(outDir, 'report.json'), toJson(report));
  log(`Report: ${path.join(outDir, 'report.md')} and report.json`);
  console.log(markdown);

  if (report.summary.error.length) return 2;
  if (report.summary.differ.length) return 1;
  return 0;
};

main().then(
  (code) => process.exit(code),
  (err) => {
    log(`Error: ${err.message}`);
    process.exit(2);
  }
);
