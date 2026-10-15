import { test } from 'node:test';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { diff, equal, preview } from '../lib/diff.mjs';

test('object key order is ignored', () => {
  assert.ok(
    equal(
      { a: 1, b: { c: [1, 2], d: null } },
      { b: { d: null, c: [1, 2] }, a: 1 }
    )
  );
  assert.deepEqual(diff({ a: 1, b: 2 }, { b: 2, a: 1 }), []);
});

test('array order is significant', () => {
  assert.ok(!equal([1, 2], [2, 1]));
  assert.notDeepEqual(diff({ x: [1, 2] }, { x: [2, 1] }), []);
});

test('YAML anchors and aliases compare equal to the expanded JSON', () => {
  const shared = { type: 'string', maxLength: 10 };
  const doc = { a: shared, b: shared, list: [shared, shared] };
  const yamlText = YAML.stringify(doc);
  assert.match(yamlText, /&a1/); // the yaml package emits an anchor
  assert.ok(equal(YAML.parse(yamlText), JSON.parse(JSON.stringify(doc))));
});

test('reports added, removed and changed paths', () => {
  const before = {
    paths: { '/Patient': { get: { summary: 'old' } }, '/Gone': {} },
    info: { title: 't' },
  };
  const after = {
    paths: { '/Patient': { get: { summary: 'new' } }, '/New': { post: {} } },
    info: { title: 't' },
  };
  assert.deepEqual(diff(before, after), [
    { op: 'removed', path: '$.paths["/Gone"]', before: {} },
    { op: 'added', path: '$.paths["/New"]', after: { post: {} } },
    {
      op: 'changed',
      path: '$.paths["/Patient"].get.summary',
      before: 'old',
      after: 'new',
    },
  ]);
});

test('an insertion in an array does not cascade into later indexes', () => {
  const before = { parameters: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] };
  const after = {
    parameters: [{ name: 'a' }, { name: 'x' }, { name: 'b' }, { name: 'c' }],
  };
  assert.deepEqual(diff(before, after), [
    { op: 'added', path: '$.parameters[1]', after: { name: 'x' } },
  ]);
});

test('a changed array element is reported inside the element', () => {
  const before = { required: [{ name: 'a', in: 'query' }, { name: 'b' }] };
  const after = { required: [{ name: 'a', in: 'path' }, { name: 'b' }] };
  assert.deepEqual(diff(before, after), [
    { op: 'changed', path: '$.required[0].in', before: 'query', after: 'path' },
  ]);
});

test('type changes are reported as a change at that path', () => {
  assert.deepEqual(diff({ a: [1] }, { a: { 0: 1 } }), [
    { op: 'changed', path: '$.a', before: [1], after: { 0: 1 } },
  ]);
});

test('preview truncates long values', () => {
  const long = { items: Array.from({ length: 100 }, (_, i) => i) };
  const text = preview(long, 40);
  assert.ok(text.length < 80);
  assert.match(text, /object with 1 keys/);
  assert.equal(preview(undefined), '(absent)');
});
