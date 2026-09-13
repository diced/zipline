import assert from 'assert/strict';
import { test } from 'node:test';
import { config } from '@/lib/tests/support';
import { humanTime, parseExpiry, parseHeaders } from '@/lib/uploader/parseHeaders';
import { ApiError } from '@/lib/api/errors';

test('upload headers decode valid filenames including Unicode', () => {
  assert.equal(
    parseHeaders({ 'x-zipline-filename': 'r%C3%A9sum%C3%A9%20photo.png' }, config.files).overrides?.filename,
    'résumé photo.png',
  );
});

for (const filename of ['%2e%2e%2fsecret', '..%5csecret', '%2Fetc%2Fpasswd', 'photo%00.png', '%', '%ZZ']) {
  test(`upload headers reject unsafe encoded filenames: ${filename}`, () => {
    assert.throws(() => parseHeaders({ 'x-zipline-filename': filename }, config.files), ApiError);
    assert.throws(
      () =>
        parseHeaders({ 'content-range': 'bytes 0-10/10', 'x-zipline-p-filename': filename }, config.files),
      ApiError,
    );
  });
}

test('upload headers decode once and preserve literal percent-encoded text', () => {
  assert.equal(
    parseHeaders({ 'x-zipline-filename': '%252Fphoto.png' }, config.files).overrides?.filename,
    '%2Fphoto.png',
  );
});

test('upload compression accepts boundary percentages and rejects out-of-range values', () => {
  for (const percent of ['0', '100'])
    assert.equal(
      parseHeaders({ 'x-zipline-image-compression-percent': percent }, config.files).imageCompression
        ?.percent,
      Number(percent),
    );

  for (const percent of ['-1', '101', 'NaN', 'Infinity'])
    assert.throws(
      () => parseHeaders({ 'x-zipline-image-compression-percent': percent }, config.files),
      ApiError,
    );
});

test('upload max views accepts positive integers', () => {
  assert.equal(parseHeaders({ 'x-zipline-max-views': '10' }, config.files).maxViews, 10);
});

for (const [value, expected] of [
  ['-1', -1],
  ['1.5', 1.5],
  ['Infinity', Infinity],
] as const) {
  test(`upload max views parses numeric value ${value} without enforcing count limits`, () => {
    assert.equal(parseHeaders({ 'x-zipline-max-views': value }, config.files).maxViews, expected);
  });
}

for (const value of ['nope', 'NaN']) {
  test(`upload max views rejects nonnumeric value ${value}`, () => {
    assert.throws(() => parseHeaders({ 'x-zipline-max-views': value }, config.files), {
      name: 'Error',
      code: 1001,
      message: 'bad options[x-zipline-max-views]: Invalid max views (NaN)',
    });
  });
}

test('humanTime and parseExpiry resolve relative durations with a fixed clock', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_800_000_000_000 });

  assert.equal(humanTime('2h')?.getTime(), Date.now() + 7_200_000);
  assert.equal(parseExpiry(' 2H ')?.getTime(), Date.now() + 7_200_000);

  for (const value of ['', 'nonsense', '0', '-1h', 'never']) assert.equal(parseExpiry(value), null);
});

test('parseExpiry accepts future absolute dates and rejects past dates', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 0, 1) });

  assert.equal(parseExpiry('date=2026-01-02T00:00:00Z')?.toISOString(), '2026-01-02T00:00:00.000Z');
  assert.equal(parseExpiry('date=2025-01-01T00:00:00Z'), null);
});

test('parseExpiry rejects malformed absolute dates', () => {
  assert.equal(parseExpiry('date=not-a-date'), null);
});

test('upload expiration applies defaults and enforces the configured maximum', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_800_000_000_000 });
  const files = { ...config.files, defaultExpiration: '1h', maxExpiration: '2h' };

  assert.deepEqual(parseHeaders({}, files).deletesAt, new Date(Date.now() + 3_600_000));
  assert.deepEqual(
    parseHeaders({ 'x-zipline-deletes-at': '2h' }, files).deletesAt,
    new Date(Date.now() + 7_200_000),
  );

  for (const expiry of ['3h', 'never'])
    assert.throws(() => parseHeaders({ 'x-zipline-deletes-at': expiry }, files), ApiError);

  assert.equal(parseHeaders({ 'x-zipline-deletes-at': 'never' }, config.files).deletesAt, 'never');
});

const partial = {
  'x-zipline-p-filename': 'photo.png',
  'x-zipline-p-content-type': 'image/png',
  'x-zipline-p-identifier': 'example',
  'x-zipline-p-content-length': '100',
} as const;

test('partial upload headers preserve chunk metadata', () => {
  assert.deepEqual(
    parseHeaders(
      { ...partial, 'content-range': 'bytes 0-50/100', 'x-zipline-p-lastchunk': 'false' },
      config.files,
    ).partial,
    {
      filename: 'photo.png',
      contentType: 'image/png',
      identifier: 'example',
      contentLength: 100,
      range: [0, 50, 100],
      lastchunk: false,
    },
  );
});

for (const range of ['bytes x-50/100', 'bytes 0-1.5/100', 'bytes 0-50/Infinity', 'bytes 0-50']) {
  test(`partial upload headers reject ranges without three integers: ${range}`, () => {
    assert.throws(() => parseHeaders({ ...partial, 'content-range': range }, config.files), {
      name: 'Error',
      code: 1001,
      message: 'bad options[content-range]: Invalid content-range',
    });
  });
}

for (const [range, expected] of [
  ['bytes 50-10/100', [50, 10, 100]],
  ['bytes 0-200/100', [0, 200, 100]],
  ['bytes 0-10/0', [0, 10, 0]],
] as const) {
  test(`partial upload headers preserve range values for route validation: ${range}`, () => {
    assert.deepEqual(
      parseHeaders({ ...partial, 'content-range': range }, config.files).partial?.range,
      expected,
    );
  });
}

for (const [length, expected] of [
  ['nope', NaN],
  ['-1', -1],
  ['Infinity', Infinity],
  ['', 0],
] as const) {
  test(`partial upload headers convert content length ${JSON.stringify(length)} without validation`, () => {
    assert.equal(
      parseHeaders(
        { ...partial, 'content-range': 'bytes 0-50/100', 'x-zipline-p-content-length': length },
        config.files,
      ).partial?.contentLength,
      expected,
    );
  });
}
