// Runs one converter build against one IG, as a black box: `node <cli.js>`
// with the fetch-cache shim preloaded.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHIM = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fetch-cache.cjs'
);

const RESERVED = [
  'inputFolder',
  'remoteUrl',
  'remoteDependencyUrl',
  'outputFolder',
];

/** Builds the converter arguments for an IG entry from igs.yaml. */
export const cliArgs = (ig, repoRoot, outputFolder) => {
  const args = [];
  if (ig.inputFolder) {
    args.push('--inputFolder', path.resolve(repoRoot, ig.inputFolder));
  } else {
    args.push('--remoteUrl', ig.packageUrl);
    for (const dep of ig.dependencyUrls || [])
      args.push('--remoteDependencyUrl', dep);
  }
  args.push('--outputFolder', outputFolder);
  for (const [key, value] of Object.entries(ig.options || {})) {
    if (RESERVED.includes(key)) {
      throw new Error(
        `IG ${ig.id}: set ${key} at the top level of the entry, not under options`
      );
    }
    for (const v of Array.isArray(value) ? value : [value]) {
      // "--flag=false" so yargs doesn't read the value as a positional.
      if (typeof v === 'boolean') args.push(`--${key}=${v}`);
      else args.push(`--${key}`, String(v));
    }
  }
  return args;
};

const listFiles = (dir, base = dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? listFiles(path.join(dir, e.name), base)
        : [
            path
              .relative(base, path.join(dir, e.name))
              .split(path.sep)
              .join('/'),
          ]
    )
    .sort();
};

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

/**
 * Warning and error messages, normalised so the two builds can be compared:
 * winston `warn:`/`error:` lines from stdout, plus stderr without stack
 * frames. Run-specific paths, PIDs and the build's own version line are
 * replaced or dropped.
 */
export const extractMessages = ({ stdout, stderr, replacements }) => {
  const normalise = (line) => {
    let out = stripAnsi(line).trimEnd();
    for (const [from, to] of replacements) out = out.split(from).join(to);
    out = out
      // winston appends {"timestamp":"..."} metadata to every line.
      .replace(/ \{"timestamp":"[^"]*"\}$/, '')
      .replace(/,"timestamp":"[^"]*"/g, '')
      .replace(/\(node:\d+\)/g, '(node:PID)')
      .replace(/\/(?:private\/)?(?:var\/folders|tmp)\/[^\s'"]*/g, '<tmp>');
    return out.length > 500 ? `${out.slice(0, 500)}…` : out;
  };
  const fromStdout = stdout
    .split('\n')
    .map(stripAnsi)
    .filter((l) => /^(warn|error):/.test(l))
    .map(normalise);
  const fromStderr = stderr
    .split('\n')
    .filter(
      (l) =>
        l.trim() &&
        !/^\s+at /.test(stripAnsi(l)) &&
        !/^\s*\.\.\. \d+ more lines/.test(l)
    )
    .map(normalise);
  return [...fromStdout, ...fromStderr];
};

const summariseNetwork = (logFile) => {
  const summary = { fromCache: 0, fetched: 0, failed: 0, urls: [] };
  if (!fs.existsSync(logFile)) return summary;
  for (const line of fs
    .readFileSync(logFile, 'utf8')
    .split('\n')
    .filter(Boolean)) {
    const rec = JSON.parse(line);
    if (rec.source === 'cache') summary.fromCache++;
    else if (rec.source === 'network') summary.fetched++;
    else summary.failed++;
    summary.urls.push(rec.url);
  }
  summary.urls = [...new Set(summary.urls)].sort();
  return summary;
};

/**
 * Runs the converter and returns { exitCode, signal, timedOut, durationMs,
 * files, messages, version, network, dir, outputDir }.
 */
export const runConverter = ({
  cli,
  ig,
  repoRoot,
  workDir,
  cacheDir,
  cacheMode,
  timeoutMs,
}) => {
  fs.rmSync(workDir, { recursive: true, force: true });
  const outputDir = path.join(workDir, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const networkLog = path.join(workDir, 'network.jsonl');
  const args = ['-r', SHIM, cli, ...cliArgs(ig, repoRoot, outputDir)];
  fs.writeFileSync(
    path.join(workDir, 'command.txt'),
    ['node', ...args].join(' ') + '\n'
  );

  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: workDir,
      env: {
        ...process.env,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        FORCE_COLOR: '0',
        NO_COLOR: '1',
        REGRESSION_CACHE_DIR: cacheDir,
        REGRESSION_CACHE_MODE: cacheMode,
        REGRESSION_CACHE_LOG: networkLog,
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    let done = false;
    const finish = (exitCode, signal, spawnError) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fs.writeFileSync(path.join(workDir, 'stdout.log'), stdout);
      fs.writeFileSync(path.join(workDir, 'stderr.log'), stderr);
      const version =
        stripAnsi(stdout).match(/Using version: (.*)/)?.[1] ?? null;
      resolve({
        exitCode,
        signal,
        timedOut,
        spawnError: spawnError ? String(spawnError) : null,
        durationMs: Date.now() - started,
        files: listFiles(outputDir),
        messages: extractMessages({
          stdout,
          stderr,
          replacements: [
            [outputDir, '<output>'],
            [workDir, '<work>'],
            [cli, '<cli.js>'],
            [repoRoot, '<repo>'],
          ],
        }),
        version,
        network: summariseNetwork(networkLog),
        dir: workDir,
        outputDir,
      });
    };
    child.on('error', (err) => finish(null, null, err));
    child.on('close', (code, signal) => finish(code, signal, null));
  });
};
