import assert from 'assert/strict';
import { test } from 'node:test';
import { config } from '@/lib/tests/support';

const { safeConfig } = await import('@/lib/config/safe');

test('public configuration excludes secrets and preserves public settings', () => {
  const input = structuredClone(config);
  input.oauth = {
    ...input.oauth,
    github: { clientId: 'test-client', clientSecret: 'oauth-secret' },
  } as typeof input.oauth;

  input.datasource = { type: 's3', s3: { secretAccessKey: 'storage-secret' } } as typeof input.datasource;
  input.discord = { webhookUrl: 'webhook-secret' } as typeof input.discord;
  const before = structuredClone(input);
  const output = safeConfig(input);

  for (const key of ['core', 'datasource', 'discord', 'httpWebhook', 'ratelimit'])
    assert.equal(Object.hasOwn(output, key), false, key);

  assert.deepEqual(output.oauth, { bypassLocalLogin: false, loginOnly: false });
  assert.equal(output.oauthEnabled.github, true);
  assert.equal(output.website.title, 'Test instance');

  for (const secret of [config.core.secret, 'oauth-secret', 'storage-secret', 'webhook-secret'])
    assert.equal(JSON.stringify(output).includes(secret), false);

  assert.deepEqual(input, before);
});
