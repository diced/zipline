import assert from 'assert/strict';
import { test } from 'node:test';
import { parseRange } from '@/lib/api/range';

test('parseRange parses inclusive start and end offsets', () => {
  assert.deepEqual(parseRange('bytes=10-19', 100), [10, 19]);
});

test('parseRange supports open-ended ranges and clamps the end to the file size', () => {
  assert.deepEqual(parseRange('bytes=90-', 100), [90, 99]);
  assert.deepEqual(parseRange('bytes=90-200', 100), [90, 99]);
});

test('parseRange preserves zero as an explicit end offset', () => {
  assert.deepEqual(parseRange('bytes=0-0', 100), [0, 0]);
});

test('parseRange returns exactly the requested number of suffix bytes', () => {
  assert.deepEqual(parseRange('bytes=-10', 100), [90, 99]);
  assert.deepEqual(parseRange('bytes=-1', 100), [99, 99]);
});

test('parseRange clamps an oversized suffix to the complete file', () => {
  assert.deepEqual(parseRange('bytes=-100', 100), [0, 99]);
  assert.deepEqual(parseRange('bytes=-200', 100), [0, 99]);
});

test('parseRange handles single-byte files', () => {
  for (const header of ['bytes=0-0', 'bytes=0-', 'bytes=-1', 'bytes=-2']) {
    assert.deepEqual(parseRange(header, 1), [0, 0]);
  }
});

test('parseRange leaves a zero-length suffix unsatisfiable', () => {
  assert.deepEqual(parseRange('bytes=-0', 100), [100, 99]);
});

for (const [header, expected] of [
  ['bytes=20-10', [20, 10]],
  ['bytes=x-10', [NaN, 10]],
  ['bytes=0-NaN', [0, 99]],
  ['bytes=0-1,5-6', [0, 99]],
  ['items=0-10', [0, 10]],
] as const) {
  test(`parseRange currently parses ${header} without validation`, () => {
    assert.deepEqual(parseRange(header, 100), expected);
  });
}
