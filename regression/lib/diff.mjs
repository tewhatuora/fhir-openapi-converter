// Semantic comparison of parsed JSON/YAML values.
// Object key order is ignored; array order is significant.

import { createHash } from 'node:crypto';

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

// Memoised per object, so subtrees shared through YAML aliases (or repeated
// by dereferencing) are hashed once.
const memo = new WeakMap();

/**
 * Hash of a value's canonical form (object keys sorted). Two values are
 * semantically equal when their fingerprints are equal.
 */
export const fingerprint = (value) => {
  if (value === null || typeof value !== 'object') {
    return `p:${JSON.stringify(value) ?? 'undefined'}`;
  }
  const cached = memo.get(value);
  if (cached) return cached;
  const hash = createHash('sha1');
  if (Array.isArray(value)) {
    hash.update('[');
    for (const item of value) hash.update(fingerprint(item)).update(',');
  } else {
    hash.update('{');
    for (const key of Object.keys(value).sort()) {
      hash
        .update(JSON.stringify(key))
        .update(':')
        .update(fingerprint(value[key]))
        .update(',');
    }
  }
  const result = hash.digest('base64');
  memo.set(value, result);
  return result;
};

export const equal = (a, b) => a === b || fingerprint(a) === fingerprint(b);

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export const childPath = (base, key) =>
  typeof key === 'number'
    ? `${base}[${key}]`
    : IDENT.test(key)
      ? `${base}.${key}`
      : `${base}[${JSON.stringify(key)}]`;

/**
 * Longest common subsequence over element fingerprints. Returns matched index
 * pairs in ascending order, or null when the arrays are too large to align.
 */
const lcs = (a, b) => {
  const n = a.length;
  const m = b.length;
  if (n * m > 4_000_000) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
};

/**
 * Lists differences between `before` and `after` as
 * { op: 'added' | 'removed' | 'changed', path, before?, after? }.
 * Array paths use the baseline index for removed/changed entries and the
 * candidate index for added ones.
 */
export const diff = (before, after, path = '$', out = []) => {
  if (isObject(before) && isObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      const p = childPath(path, key);
      if (!(key in after))
        out.push({ op: 'removed', path: p, before: before[key] });
      else if (!(key in before))
        out.push({ op: 'added', path: p, after: after[key] });
      else diff(before[key], after[key], p, out);
    }
    return out;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    diffArrays(before, after, path, out);
    return out;
  }
  if (!equal(before, after)) {
    out.push({ op: 'changed', path, before, after });
  }
  return out;
};

const diffArrays = (before, after, path, out) => {
  const a = before.map(fingerprint);
  const b = after.map(fingerprint);
  if (a.length === b.length && a.every((x, i) => x === b[i])) return;

  // Align unchanged elements first so one insertion doesn't cascade into
  // changes at every later index. Too large to align: compare by index.
  const pairs = lcs(a, b);
  if (!pairs) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i++) {
      const p = childPath(path, i);
      if (i >= after.length)
        out.push({ op: 'removed', path: p, before: before[i] });
      else if (i >= before.length)
        out.push({ op: 'added', path: p, after: after[i] });
      else diff(before[i], after[i], p, out);
    }
    return;
  }

  // Walk the gaps between matched elements. Within a gap, pair leftovers
  // positionally as changes, then report the remainder as added/removed.
  let i = 0;
  let j = 0;
  for (const [mi, mj] of [...pairs, [before.length, after.length]]) {
    const removed = [];
    const added = [];
    for (; i < mi; i++) removed.push(i);
    for (; j < mj; j++) added.push(j);
    const paired = Math.min(removed.length, added.length);
    for (let k = 0; k < paired; k++) {
      diff(
        before[removed[k]],
        after[added[k]],
        childPath(path, removed[k]),
        out
      );
    }
    for (const r of removed.slice(paired)) {
      out.push({ op: 'removed', path: childPath(path, r), before: before[r] });
    }
    for (const ad of added.slice(paired)) {
      out.push({ op: 'added', path: childPath(path, ad), after: after[ad] });
    }
    i = mi + 1;
    j = mj + 1;
  }
};

/** Compact single-line rendering of a value, truncated to `max` characters. */
export const preview = (value, max = 160) => {
  if (value === undefined) return '(absent)';
  const text = JSON.stringify(value) ?? String(value);
  if (text.length <= max) return text;
  const summary = Array.isArray(value)
    ? `array of ${value.length}`
    : isObject(value)
      ? `object with ${Object.keys(value).length} keys`
      : `${text.length} chars`;
  return `${text.slice(0, max)}… (${summary})`;
};
