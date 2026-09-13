import assert from 'assert/strict';
import { test } from 'node:test';
import { config } from '@/lib/tests/support';
import { encrypt } from '@/lib/crypto';
import { generatePKCEChallenge, generatePKCEVerifier } from '@/lib/oauth/pkce';

const { encryptOAuthState, decryptOAuthState, parseOAuthState, generateOAuthState } =
  await import('@/lib/oauth/state');

test('OAuth state round trips both modes and URL-encoded state', () => {
  for (const mode of ['default', 'link'] as const) {
    const state = { mode, nonce: 'test-nonce' };
    const encrypted = encryptOAuthState(state);

    assert.deepEqual(parseOAuthState(encrypted), state);
    assert.deepEqual(parseOAuthState(encodeURIComponent(encrypted)), state);
    assert.equal(decryptOAuthState(encrypted), JSON.stringify(state));
  }
});

test('OAuth state accepts legacy mode strings', () => {
  for (const mode of ['default', 'link'])
    assert.deepEqual(parseOAuthState(encrypt(mode, config.core.secret)), { mode });
});

test('OAuth state rejects missing, malformed, and tampered callback parameters', () => {
  for (const value of [undefined, '', '%', 'garbage']) assert.equal(parseOAuthState(value), null);

  const encrypted = encryptOAuthState({ mode: 'link', nonce: 'nonce' });
  const tampered = (encrypted[0] === '0' ? '1' : '0') + encrypted.slice(1);

  assert.equal(parseOAuthState(tampered), null);
});

test('OAuth state generation saves the same nonce that is encrypted', async () => {
  const saved: string[] = [];
  const session = {
    oauthState: '',
    async save() {
      saved.push(this.oauthState);
    },
  };
  const state = await generateOAuthState(session, 'link');

  assert.match(session.oauthState, /^[A-Za-z0-9]{32}$/);
  assert.deepEqual(saved, [session.oauthState]);
  assert.deepEqual(parseOAuthState(state), { mode: 'link', nonce: session.oauthState });
});

test('PKCE challenge matches the RFC 7636 example', () => {
  assert.equal(
    generatePKCEChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});

test('PKCE verifiers use the default length and URL-safe characters', () => {
  assert.match(generatePKCEVerifier(), /^[A-Za-z0-9_-]{43}$/);
});
