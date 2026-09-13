import assert from 'assert/strict';
import { test } from 'node:test';
import { sanitizeExtension, sanitizeFilename } from '@/lib/fs';

test('sanitizeFilename preserves ordinary filenames', () => {
  for (const name of ['photo.png', 'my upload (1).jpg', 'résumé.pdf', '.hidden', 'archive.tar.gz'])
    assert.equal(sanitizeFilename(name), name);
});

test('sanitizeFilename rejects traversal, absolute paths, and nested paths', () => {
  for (const name of [
    '../secret.txt',
    '..\\secret.txt',
    'nested/../../secret.txt',
    'nested\\..\\secret.txt',
    '/etc/passwd',
    'C:\\Windows\\config.ini',
    '\\\\server\\share\\secret.txt',
    'nested/photo.png',
  ]) {
    assert.equal(sanitizeFilename(name), null, JSON.stringify(name));
  }
});

test('sanitizeFilename rejects empty names, dot segments, and null bytes', () => {
  for (const name of ['', '.', '..', 'photo\0.png'])
    assert.equal(sanitizeFilename(name), null, JSON.stringify(name));
});

test('sanitizeExtension adds a leading dot without duplicating it', () => {
  assert.equal(sanitizeExtension('png'), '.png');
  assert.equal(sanitizeExtension('.jpg'), '.jpg');
  assert.equal(sanitizeExtension('tar.gz'), '.tar.gz');
});

test('sanitizeExtension rejects traversal and path separators', () => {
  for (const extension of ['../png', '..\\png', 'png/secret', 'png\\secret', '..', '.tar..gz'])
    assert.equal(sanitizeExtension(extension), null, JSON.stringify(extension));
});
