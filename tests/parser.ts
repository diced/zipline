import { parseString, type ParseValue } from '@/lib/parser';
import assert from 'assert/strict';
import { test } from 'node:test';

const secrets = {
  password: 'test-password-secret',
  avatar: 'test-avatar-data',
  passkey: 'test-passkey-data',
  oauth: 'test-oauth-data',
};

function values() {
  return {
    file: { name: 'photo.png', size: 2048, views: 5, createdAt: new Date('2026-01-01T12:30:00Z') },
    user: {
      username: 'Zipline',
      password: secrets.password,
      avatar: secrets.avatar,
      passkeys: [secrets.passkey],
      oauthProviders: [secrets.oauth],
    },
    link: { returned: 'https://zipline.local/u/photo.png', raw: 'https://zipline.local/raw/photo.png' },
  } as unknown as ParseValue;
}

test('templates replace repeated placeholders and escaped newlines', () => {
  assert.equal(
    parseString('{file.name} / {file.name}\\n{user.username}', values()),
    'photo.png / photo.png\nZipline',
  );
  assert.equal(parseString('', values()), null);
});

test('templates distinguish missing types and missing properties', () => {
  assert.equal(parseString('{url.destination}', values()), '{unknown_type}');
  assert.equal(parseString('{file.missing}', values()), '{unknown_property}');
});

test('template modifiers format strings, numbers, and dates', () => {
  assert.equal(parseString('{user.username::upper} {user.username::lower}', values()), 'ZIPLINE zipline');
  assert.equal(parseString('{file.size::bytes} {file.views::binary}', values()), '2 KB 101');
  assert.equal(parseString('{file.createdAt::iso}', values()), '2026-01-01T12:30:00.000Z');
});

test('template conditional branches handle numeric comparisons and nested replacements', () => {
  assert.equal(parseString('{file.views::>=5["popular"||"new"]}', values()), 'popular');
  assert.equal(parseString('{file.views::<5["new"||"{user.username}"]}', values()), 'Zipline');
  assert.equal(parseString('{file.name::~photo["image"||"other"]}', values()), 'image');
});

test('templates block direct secret access and redact debug JSON', () => {
  const input = values();

  for (const property of ['password', 'avatar', 'passkeys', 'oauthProviders'])
    assert.equal(parseString(`{user.${property}}`, input), '{unknown_property}');

  for (const template of ['{debug.json}', '{debug.jsonf}']) {
    const output = parseString(template, input)!;

    for (const secret of Object.values(secrets)) assert.equal(output.includes(secret), false);

    assert.deepEqual(JSON.parse(output).user, {
      username: 'Zipline',
      password: '***',
      avatar: '***',
      passkeys: 'passkey registration redacted',
      oauthProviders: 'oauth providers redacted',
    });
  }
});

test('filenames containing template syntax remain literal data', () => {
  const input = values();
  input.file!.name = '{user.username}.png';

  assert.equal(parseString('{file.name}', input), '{user.username}.png');
});
