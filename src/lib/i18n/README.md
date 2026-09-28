# i18n

The dashboard and public pages are translated with [i18next](https://www.i18next.com/) and `react-i18next`.

## Languages

`en` (source), `zh` (Simplified Chinese), `ja`, `fr`, `de`, `es`, `pt` (Brazilian conventions), `ru`. The list lives in `languages.ts`.

The language is picked in this order:

1. The explicit choice saved in `localStorage` under `zipline-language` (only written when a user picks a language from the switcher).
2. The first entry of `navigator.languages` whose primary subtag is supported (`zh-TW` -> `zh`, `pt-BR` -> `pt`).
3. English.

The server always renders English; the client re-renders in the detected language right after load.

## Fallback

A key that is missing, or an empty string, in a translation falls back to English (`fallbackLng: 'en'`, `returnEmptyString: false`). Never leave a value empty on purpose: delete the key instead.

## Files

- `locales/<lng>/<namespace>.json`: one file per namespace, loaded automatically.
- `resources.ts`: namespaces and their types. English is the source of truth; keys passed to `t` are type-checked against `locales/en`.
- `index.ts`: initialisation, detection, `setLanguage`, dayjs locale switching.

## Writing code

```tsx
const { t } = useTranslation('files');
const { t } = useTranslation(['files', 'common']); // needed for t('common:...')
t('table.columns.name');
t('bulk.deleted', { count });
<Trans t={t} i18nKey='help.docs' components={{ link: <Anchor href='...' /> }} />
```

Outside components use `i18n.t('files:...')` from `@/lib/i18n`. Never call `t` at module top level; store keys and translate at render time.

Rules: structured camelCase keys (never an English sentence as a key), one full sentence per key with `{{placeholders}}` instead of concatenation, `key_one`/`key_other` for plurals.

## Adding or changing a string

1. Add the key to `locales/en/<namespace>.json`.
2. Add it to the other languages (or leave it out, English will show until translated).
3. Run `pnpm test`. `tests/i18n.ts` checks that every translated key exists in English, placeholders and `<Trans>` tags match, no value is empty, and every plural key has all forms the language needs:
   - `zh`, `ja`: `_other`
   - `de`: `_one`, `_other`
   - `fr`, `es`, `pt`: `_one`, `_many`, `_other`
   - `ru`: `_one`, `_few`, `_many`, `_other`

## Adding a language

Add the code to `LANGUAGES`, its native name to `LANGUAGE_NAMES` and its dayjs locale to `DAYJS_LOCALES` in `languages.ts`, import that dayjs locale in `index.ts`, then create `locales/<lng>/`.

## Not translated

Brand and protocol names, server-provided messages (API errors), admin-configured text such as the website title and external links, and generated uploader config files.
