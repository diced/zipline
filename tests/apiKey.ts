import {
  apiKeyHashesMatch,
  createApiKeyToken,
  hashApiKeyToken,
  parseApiKeyToken,
  requiredApiKeyScope,
} from '@/lib/apiKey';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('API key tokens contain a lookup prefix and store only a stable hash', () => {
  const first = createApiKeyToken();
  const second = createApiKeyToken();

  assert.match(first.token, /^zpl_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(parseApiKeyToken(first.token), { prefix: first.prefix, token: first.token });
  assert.equal(first.secretHash, hashApiKeyToken(first.token));
  assert.equal(apiKeyHashesMatch(first.secretHash, hashApiKeyToken(first.token)), true);
  assert.equal(apiKeyHashesMatch(first.secretHash, second.secretHash), false);
  assert.notEqual(first.prefix, second.prefix);
  assert.notEqual(first.secretHash, first.token);
});

test('API key parsing rejects malformed and legacy account tokens', () => {
  for (const token of ['', 'zpl_short_secret', 'Bearer zpl_demo', 'legacy.encrypted.token']) {
    assert.equal(parseApiKeyToken(token), null);
  }
});

test('API key scopes cover file and short URL routes and deny account routes', () => {
  assert.equal(requiredApiKeyScope('POST', '/api/upload'), 'files:write');
  assert.equal(requiredApiKeyScope('GET', '/api/user/files'), 'files:read');
  assert.equal(requiredApiKeyScope('PATCH', '/api/user/files/file-id'), 'files:write');
  assert.equal(requiredApiKeyScope('POST', '/api/user/files/file-id/password'), 'files:read');
  assert.equal(requiredApiKeyScope('GET', '/api/user/folders/folder-id/export'), 'files:read');
  assert.equal(requiredApiKeyScope('DELETE', '/api/user/tags/tag-id'), 'files:write');
  assert.equal(requiredApiKeyScope('GET', '/api/user/urls'), 'urls:read');
  assert.equal(requiredApiKeyScope('POST', '/api/user/urls'), 'urls:write');
  assert.equal(requiredApiKeyScope('GET', '/api/user'), null);
  assert.equal(requiredApiKeyScope('GET', '/api/user/api-keys'), null);
  assert.equal(requiredApiKeyScope('GET', '/api/server/settings'), null);
});
