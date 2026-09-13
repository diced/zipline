import assert from 'assert/strict';
import { test } from 'node:test';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { LocalDatasource } from '@/lib/datasource/Local';
import { temporaryDirectory } from '@/lib/tests/support';

test('local storage writes, reads, ranges, renames, lists, and deletes files', async (t) => {
  const dir = await temporaryDirectory(t);
  const store = new LocalDatasource(dir);

  await store.put('hello.txt', Buffer.from('hello world'));

  assert.equal(
    await store
      .get('hello.txt')!
      .toArray()
      .then((chunks) => Buffer.concat(chunks).toString()),
    'hello world',
  );
  assert.equal(await store.size('hello.txt'), 11);
  assert.equal(await store.totalSize(), 11);

  const stream = await store.range('hello.txt', 0, 4);
  assert.equal(Buffer.concat(await stream.toArray()).toString(), 'hello');

  await store.rename('hello.txt', 'renamed.txt');
  assert.deepEqual(await store.list({ prefix: 'renamed' }), ['renamed.txt']);

  await store.delete('renamed.txt');
  assert.equal(store.get('renamed.txt'), null);
  assert.equal(await store.size('renamed.txt'), 0);
});

test('local storage rejects escapes for every path-taking operation', async (t) => {
  const root = await temporaryDirectory(t);
  const dir = join(root, 'uploads');
  const sibling = join(root, 'uploads-backup');

  await mkdir(dir);
  await mkdir(sibling);
  await writeFile(join(root, 'secret'), 'outside');
  await writeFile(join(sibling, 'secret'), 'sibling');

  const store = new LocalDatasource(dir);
  await store.put('inside', Buffer.from('inside'));

  for (const path of ['../secret', '../uploads-backup/secret', join(root, 'secret'), dir, '.']) {
    assert.equal(store.get(path), null, path);
    await assert.rejects(store.put(path, Buffer.from('bad')), /Invalid path/);
    await assert.rejects(store.delete(path), /Invalid path/);
    await assert.rejects(store.size(path), /Invalid path/);
    await assert.rejects(store.range(path, 0, 1), /Invalid path/);
    await assert.rejects(store.rename('inside', path), /Invalid path/);
    await assert.rejects(store.rename(path, 'inside'), /Invalid path/);
  }

  assert.equal(await readFile(join(root, 'secret'), 'utf8'), 'outside');
  assert.equal(await readFile(join(sibling, 'secret'), 'utf8'), 'sibling');
});

test('local storage can copy or consume a temporary upload according to noDelete', async (t) => {
  const root = await temporaryDirectory(t);
  await mkdir(join(root, 'uploads'));

  const source = join(root, 'source');
  await writeFile(source, 'content');

  const store = new LocalDatasource(join(root, 'uploads'));
  await store.put('copied', source, { noDelete: true });

  assert.equal(await readFile(source, 'utf8'), 'content');

  await store.put('moved', source);

  await assert.rejects(readFile(source), { code: 'ENOENT' });
  assert.equal(await readFile(join(root, 'uploads', 'moved'), 'utf8'), 'content');
});
