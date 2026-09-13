import assert from 'assert/strict';
import { test } from 'node:test';
import { buildFolderHierarchy, getDescendantIds } from '@/lib/folderHierarchy';
import type { Folder } from '@/lib/db/models/folder';

const folders = [
  { id: 'b', name: 'Beta', parentId: null },
  { id: 'a', name: 'Alpha', parentId: null },
  { id: 'c', name: 'Child', parentId: 'a' },
  { id: 'g', name: 'Grandchild', parentId: 'c' },
] as Folder[];

test('folder descendants include all nested children and exclude unrelated folders', () => {
  assert.deepEqual(getDescendantIds('a', folders), new Set(['c', 'g']));
  assert.deepEqual(getDescendantIds('b', folders), new Set());
  assert.deepEqual(getDescendantIds('unknown', folders), new Set());
});

test('folder hierarchy sorts siblings and calculates paths and depth without mutating input', () => {
  const before = structuredClone(folders);

  assert.deepEqual(buildFolderHierarchy(folders), [
    { id: 'a', name: 'Alpha', path: 'Alpha', depth: 0 },
    { id: 'c', name: 'Child', path: 'Alpha / Child', depth: 1 },
    { id: 'g', name: 'Grandchild', path: 'Alpha / Child / Grandchild', depth: 2 },
    { id: 'b', name: 'Beta', path: 'Beta', depth: 0 },
  ]);
  assert.deepEqual(folders, before);
});

test('folder hierarchy excludes an entire subtree and handles empty input', () => {
  assert.deepEqual(
    buildFolderHierarchy(folders, new Set(['c'])).map((folder) => folder.id),
    ['a', 'b'],
  );
  assert.deepEqual(buildFolderHierarchy([]), []);
});
