import { fileRequestAccepts, normalizeAllowedTypes } from '@/lib/db/models/fileRequest';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('file request type rules normalize extensions and MIME types', () => {
  assert.deepEqual(normalizeAllowedTypes([' .PNG, jpg ', 'image/*', 'application/pdf', 'jpg']), [
    'png',
    'jpg',
    'image/*',
    'application/pdf',
  ]);
});

test('file request type rules match extensions, exact MIME types, and MIME groups', () => {
  assert.equal(fileRequestAccepts('image/png', 'photo.PNG', ['png']), true);
  assert.equal(fileRequestAccepts('application/pdf', 'document.bin', ['application/pdf']), true);
  assert.equal(fileRequestAccepts('image/webp', 'photo.webp', ['image/*']), true);
  assert.equal(fileRequestAccepts('text/plain', 'notes.txt', ['png', 'application/pdf']), false);
  assert.equal(fileRequestAccepts('application/octet-stream', 'README', []), true);
});
