import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { LocalDatasource } from '../src/lib/datasource/Local';

test('copies path-based writes regardless of path format', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'zipline-local-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const source = join(root, 'source.txt');
  const uploads = join(root, 'uploads');
  await mkdir(uploads);
  await writeFile(source, 'uploaded contents');

  await new LocalDatasource(uploads).put('stored.txt', relative(process.cwd(), source), {
    noDelete: true,
  });

  assert.equal(await readFile(join(uploads, 'stored.txt'), 'utf8'), 'uploaded contents');
});
