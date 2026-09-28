import assert from 'assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEFAULT_LANGUAGE, LANGUAGES, matchLanguage } from '@/lib/i18n/languages';

const LOCALES_DIR = join(import.meta.dirname, '../src/lib/i18n/locales');
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];

type Messages = Record<string, string>;

function flatten(value: unknown, prefix = '', out: Messages = {}): Messages {
  if (typeof value === 'string') {
    out[prefix] = value;
    return out;
  }

  assert.ok(
    value && typeof value === 'object' && !Array.isArray(value),
    `${prefix} must be a string or object`,
  );
  for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);

  return out;
}

function readNamespace(lng: string, ns: string): Messages {
  return flatten(JSON.parse(readFileSync(join(LOCALES_DIR, lng, `${ns}.json`), 'utf8')));
}

function pluralBase(key: string) {
  const match = key.match(/^(.*)_([a-z]+)$/);
  return match && PLURAL_SUFFIXES.includes(match[2]) ? { base: match[1], suffix: match[2] } : null;
}

const tokens = (value: string) =>
  [
    ...[...value.matchAll(/{{\s*([\w.]+)[^}]*}}/g)].map((m) => `{{${m[1]}}}`),
    ...[...value.matchAll(/<\/?([\w-]+)\s*\/?>/g)].map((m) => `<${m[1]}>`),
  ].sort();

const namespaces = readdirSync(join(LOCALES_DIR, DEFAULT_LANGUAGE))
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -'.json'.length));

test('browser language tags resolve to a supported language by their primary subtag', () => {
  assert.equal(matchLanguage('zh-CN'), 'zh');
  assert.equal(matchLanguage('zh-TW'), 'zh');
  assert.equal(matchLanguage('pt-BR'), 'pt');
  assert.equal(matchLanguage('es-419'), 'es');
  assert.equal(matchLanguage('en_US'), 'en');
  assert.equal(matchLanguage('DE'), 'de');
  assert.equal(matchLanguage('it-IT'), null);
});

test('every supported language has a locale directory and no unknown directory exists', () => {
  const dirs = readdirSync(LOCALES_DIR).sort();

  assert.deepEqual(dirs, [...LANGUAGES].sort());
});

for (const lng of LANGUAGES.filter((l) => l !== DEFAULT_LANGUAGE)) {
  test(`${lng} translations match the english source`, () => {
    const categories = new Intl.PluralRules(lng).resolvedOptions().pluralCategories;

    for (const file of readdirSync(join(LOCALES_DIR, lng))) {
      const ns = file.slice(0, -'.json'.length);
      assert.ok(namespaces.includes(ns), `${lng}/${file} has no english namespace`);

      const source = readNamespace(DEFAULT_LANGUAGE, ns);
      const target = readNamespace(lng, ns);

      for (const [key, value] of Object.entries(target)) {
        const where = `${lng}/${ns}:${key}`;
        assert.notEqual(value.trim(), '', `${where} is empty, delete it to fall back to english instead`);

        const plural = pluralBase(key);
        const sourceKey =
          key in source ? key : plural && `${plural.base}_other` in source ? `${plural.base}_other` : null;
        assert.ok(sourceKey, `${where} does not exist in english`);

        if (plural && sourceKey !== key) {
          assert.ok(
            categories.includes(plural.suffix as Intl.LDMLPluralRule),
            `${where} is not a ${lng} plural form`,
          );
        }

        // the count may be implied by the wording in a plural form, every other token must survive
        const expected = tokens(source[sourceKey]).filter((t) => !(plural && t === '{{count}}'));
        const actual = tokens(value).filter((t) => !(plural && t === '{{count}}'));
        assert.deepEqual(actual, expected, `${where} placeholders or tags differ from english`);
      }

      const translatedPlurals = new Set(
        Object.keys(target)
          .map((key) => pluralBase(key)?.base)
          .filter((base) => base && `${base}_other` in source),
      );
      for (const base of translatedPlurals) {
        for (const category of categories) {
          assert.ok(`${base}_${category}` in target, `${lng}/${ns}:${base}_${category} is missing`);
        }
      }
    }
  });
}
