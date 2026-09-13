import assert from 'assert/strict';
import { test } from 'node:test';
import { config } from '@/lib/tests/support';
import { guess, normalizeMimetype } from '@/lib/mimes';
import { ApiError } from '@/lib/api/errors';

const { enforceMimetypePolicy, resolveUploadMimetype } = await import('@/lib/api/upload');

test('MIME normalization removes parameters and normalizes case and whitespace', () => {
  assert.equal(normalizeMimetype(' Text/HTML; charset=UTF-8 '), 'text/html');

  for (const value of [undefined, null, '', ' ', 'not-a-type']) assert.equal(normalizeMimetype(value), null);
});

test('extension lookup handles dots, whitespace, case, and unknown types', async () => {
  assert.equal(await guess(' .PNG '), 'image/png');
  assert.equal(await guess('jpg'), 'image/jpeg');

  for (const value of [undefined, null, '', 'unknown-zipline-extension'])
    assert.equal(await guess(value), 'application/octet-stream');
});

test('MIME policy normalizes blocked types and applies an allowed fallback', (t) => {
  const previous = { ...config.files };
  t.after(() => Object.assign(config.files, previous));

  config.files.disabledTypes = ['Text/HTML'];
  config.files.disabledTypesDefault = 'text/plain';

  assert.deepEqual(enforceMimetypePolicy('TEXT/HTML; charset=utf-8'), {
    mimetype: 'text/plain',
    remapped: true,
  });
  assert.deepEqual(enforceMimetypePolicy('image/png'), { mimetype: 'image/png', remapped: false });
});

test('MIME policy rejects blocked types when the fallback is absent or also blocked', (t) => {
  const previous = { ...config.files };
  t.after(() => Object.assign(config.files, previous));

  config.files.disabledTypes = ['text/html'];

  for (const fallback of [null, 'text/html']) {
    config.files.disabledTypesDefault = fallback;

    assert.throws(() => enforceMimetypePolicy('text/html'), ApiError);
  }
});

test('upload MIME resolution chooses the declared type or extension according to configuration', async (t) => {
  const previous = { ...config.files };
  t.after(() => Object.assign(config.files, previous));
  config.files.assumeMimetypes = false;

  assert.deepEqual(await resolveUploadMimetype('text/plain', '.png'), {
    mimetype: 'text/plain',
    assumed: false,
    remapped: false,
  });

  config.files.assumeMimetypes = true;
  assert.deepEqual(await resolveUploadMimetype('text/plain', '.png'), {
    mimetype: 'image/png',
    assumed: true,
    remapped: false,
  });

  assert.equal(
    (await resolveUploadMimetype(null, '.unknown-extension')).mimetype,
    'application/octet-stream',
  );

  config.files.disabledTypes = ['image/png'];
  config.files.disabledTypesDefault = 'application/octet-stream';
  assert.equal((await resolveUploadMimetype('text/plain', '.png')).remapped, true);
});
