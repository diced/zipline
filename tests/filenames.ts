import assert from 'assert/strict';
import { test } from 'node:test';
import { config } from '@/lib/tests/support';

const { formatFileName } = await import('@/lib/uploader/formatFileName');
const { getExtension } = await import('@/lib/api/upload');

test('original-name formatting rejects unsafe uploaded filenames', () => {
  for (const name of ['../secret.txt', '..\\secret.txt', '/etc/passwd', 'photo\0.png'])
    assert.equal(formatFileName('name', name), null);
});

test('original-name formatting preserves hidden names and strips only the final extension', () => {
  assert.equal(formatFileName('name', '.hidden'), '.hidden');
  assert.equal(formatFileName('name', 'archive.tar.gz'), 'archive.tar');
  assert.equal(formatFileName('name', 'résumé.pdf'), 'résumé');
});

test('random and UUID filename formats have the expected shape', () => {
  assert.match(formatFileName('random')!, new RegExp(`^[A-Za-z0-9]{${config.files.length}}$`));

  assert.match(
    formatFileName('uuid')!,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('date filenames use the configured date format and collision suffix', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 15, 12).getTime() });

  assert.equal(formatFileName('date'), '2026-01-15');
  assert.equal(formatFileName('date', undefined, 2), '2026-01-15-2');
});

test('extension selection recognizes compound extensions and respects overrides', () => {
  assert.equal(getExtension('archive.tar.gz'), '.tar.gz');
  assert.equal(getExtension('report.csv.gz'), '.csv.gz');
  assert.equal(getExtension('photo.png'), '.png');
  assert.equal(getExtension('.hidden'), '');
  assert.equal(getExtension('no-extension'), '');
  assert.equal(getExtension('photo.png', '.webp'), '.webp');
});
