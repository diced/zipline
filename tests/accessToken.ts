import assert from 'assert/strict';
import { test } from 'node:test';
import '@/lib/tests/support';
import { encrypt } from '@/lib/crypto';

const { createAccessToken, verifyAccessToken } = await import('@/lib/accessToken');

test('access tokens are bound to both resource type and ID', () => {
  const token = createAccessToken({ type: 'file', id: 'a' });

  assert.equal(verifyAccessToken(token, 'file', 'a'), true);
  assert.equal(verifyAccessToken(token, 'url', 'a'), false);
  assert.equal(verifyAccessToken(token, 'file', 'b'), false);
});

test('access tokens expire after five minutes', (t) => {
  const now = 1_800_000_000_000;
  t.mock.timers.enable({ apis: ['Date'], now });

  const token = createAccessToken({ type: 'file', id: 'a' });

  t.mock.timers.setTime(now + 299_999);
  assert.equal(verifyAccessToken(token, 'file', 'a'), true);

  t.mock.timers.setTime(now + 300_001);
  assert.equal(verifyAccessToken(token, 'file', 'a'), false);
});

test('missing, corrupted, and wrongly encrypted access tokens are rejected', () => {
  for (const token of [undefined, null, '', 'garbage', encrypt('{}', 'wrong-secret')]) {
    assert.equal(verifyAccessToken(token, 'file', 'a'), false);
  }
});
