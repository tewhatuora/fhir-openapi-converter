// Compares the baseline and candidate runs for one IG.

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { diff, equal, preview } from './diff.mjs';

// Keep report.json readable for large regressions; counts are always exact.
const MAX_DIFFS_PER_FILE = 500;

const OAS_FILE = /^(.*)\.openapi\.(json|yaml)$/;

/** Parses an output file; YAML anchors/aliases resolve to plain values. */
const load = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(text);
  if (/\.ya?ml$/.test(file)) return YAML.parse(text, { maxAliasCount: -1 });
  return text;
};

const loadSafe = (file) => {
  try {
    return { value: load(file) };
  } catch (err) {
    return {
      error: `${path.basename(file)}: ${err.message}`,
      value: fs.readFileSync(file, 'utf8'),
    };
  }
};

const multisetDiff = (a, b) => {
  const counts = new Map();
  for (const x of a) counts.set(x, (counts.get(x) || 0) + 1);
  const onlyB = [];
  for (const x of b) {
    if (counts.get(x)) counts.set(x, counts.get(x) - 1);
    else onlyB.push(x);
  }
  const onlyA = [...counts].flatMap(([x, n]) => Array(n).fill(x));
  return { onlyA, onlyB };
};

const compareFile = (baseFile, candFile) => {
  const before = loadSafe(baseFile);
  const after = loadSafe(candFile);
  const parseErrors = [
    before.error && `baseline ${before.error}`,
    after.error && `candidate ${after.error}`,
  ].filter(Boolean);
  if (
    equal(before.value, after.value) &&
    Boolean(before.error) === Boolean(after.error)
  ) {
    return { status: 'match', diffCount: 0, diffs: [], parseErrors };
  }
  const all = diff(before.value, after.value);
  return {
    status: 'differ',
    diffCount: all.length,
    counts: {
      added: all.filter((d) => d.op === 'added').length,
      removed: all.filter((d) => d.op === 'removed').length,
      changed: all.filter((d) => d.op === 'changed').length,
    },
    // Fingerprint of the change list, to spot JSON and YAML differing alike.
    signature: JSON.stringify(all.map((d) => [d.op, d.path])),
    diffs: all.slice(0, MAX_DIFFS_PER_FILE).map((d) => ({
      op: d.op,
      path: d.path,
      ...(d.op !== 'added' ? { before: preview(d.before, 1000) } : {}),
      ...(d.op !== 'removed' ? { after: preview(d.after, 1000) } : {}),
    })),
    parseErrors,
  };
};

/** Groups output files by CapabilityStatement id (from <id>.openapi.<ext>). */
const groupFiles = (files) => {
  const groups = new Map();
  for (const f of files) {
    const m = path.basename(f).match(OAS_FILE);
    const id = m ? m[1] : '(other files)';
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(f);
  }
  return groups;
};

export const compareRuns = (baseline, candidate) => {
  const exitCodeMatch =
    baseline.exitCode === candidate.exitCode &&
    baseline.signal === candidate.signal;
  const messages = multisetDiff(baseline.messages, candidate.messages);
  const files = multisetDiff(baseline.files, candidate.files);
  const messagesMatch =
    messages.onlyA.length === 0 && messages.onlyB.length === 0;
  const filesMatch = files.onlyA.length === 0 && files.onlyB.length === 0;

  const capabilityStatements = [];
  const allIds = new Set([
    ...groupFiles(baseline.files).keys(),
    ...groupFiles(candidate.files).keys(),
  ]);
  for (const id of [...allIds].sort()) {
    const baseFiles = groupFiles(baseline.files).get(id) || [];
    const candFiles = groupFiles(candidate.files).get(id) || [];
    const fileResults = {};
    for (const f of [...new Set([...baseFiles, ...candFiles])].sort()) {
      if (!baseFiles.includes(f)) fileResults[f] = { status: 'only-candidate' };
      else if (!candFiles.includes(f))
        fileResults[f] = { status: 'only-baseline' };
      else
        fileResults[f] = compareFile(
          path.join(baseline.outputDir, f),
          path.join(candidate.outputDir, f)
        );
    }
    const statuses = Object.values(fileResults).map((r) => r.status);
    capabilityStatements.push({
      id,
      status: statuses.every((s) => s === 'match') ? 'match' : 'differ',
      files: fileResults,
    });
  }

  const contentMatch = capabilityStatements.every((c) => c.status === 'match');
  return {
    status:
      exitCodeMatch && messagesMatch && filesMatch && contentMatch
        ? 'match'
        : 'differ',
    exitCode: {
      baseline: baseline.exitCode,
      candidate: candidate.exitCode,
      match: exitCodeMatch,
    },
    messages: {
      match: messagesMatch,
      onlyBaseline: messages.onlyA,
      onlyCandidate: messages.onlyB,
    },
    files: {
      match: filesMatch,
      onlyBaseline: files.onlyA,
      onlyCandidate: files.onlyB,
    },
    capabilityStatements,
  };
};
