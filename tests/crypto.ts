import assert from 'assert/strict';
import { test } from 'node:test';
import {
  encrypt,
  decrypt,
  encryptToken,
  decryptToken,
  createToken,
  hashPassword,
  verifyPassword,
} from '@/lib/crypto';

const secret = 'test-only-encryption-secret';

test('encrypting an OAuth payload twice uses distinct IVs', () => {
  const payload = JSON.stringify({ mode: 'default', nonce: 'a'.repeat(32) });
  const first = encrypt(payload, secret);
  const second = encrypt(payload, secret);

  assert.notEqual(first.split('.')[0], second.split('.')[0]);
  assert.equal(decrypt(second, secret), payload);
});

test('decryption rejects wrong secrets and tampered IVs, ciphertext, or authentication tags', () => {
  const encrypted = encrypt('hello', secret);
  assert.throws(() => decrypt(encrypted, 'wrong-secret'));

  for (let index = 0; index < 3; index++) {
    const parts = encrypted.split('.');
    parts[index] = (parts[index][0] === '0' ? '1' : '0') + parts[index].slice(1);

    assert.throws(() => decrypt(parts.join('.'), secret));
  }
});

test('decryption rejects missing or truncated fields', () => {
  for (const value of ['', 'not-encrypted', '00.00', '00.00.00']) assert.throws(() => decrypt(value, secret));
});

test('token envelopes preserve timestamps and token contents', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_800_000_000_000 });
  const token = createToken();
  const [date, random] = token.split('.').map((part) => Buffer.from(part, 'base64').toString());

  assert.equal(date, String(Date.now()));
  assert.match(random, /^[A-Za-z0-9]{32}$/);
  assert.deepEqual(decryptToken(encryptToken(token, secret), secret), [Date.now(), token]);
});

test('token decoding returns null for malformed input and wrong secrets', () => {
  for (const value of ['', '.', 'abc.def', 'not-a-token']) assert.equal(decryptToken(value, secret), null);

  assert.equal(decryptToken(encryptToken('token', secret), 'wrong'), null);
});

test('password hashes verify the original password and reject another password', async () => {
  const hash = await hashPassword('test password 🔐');

  assert.notEqual(hash, 'test password 🔐');
  assert.equal(await verifyPassword('test password 🔐', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});
