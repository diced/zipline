import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { bundledLanguagesInfo } from 'shiki/langs';
import codeMeta from '../../../../code.json';

let highlighter: ReturnType<typeof createHighlighterCore> | undefined;

export async function highlight(code: string, language: string, colorScheme: 'light' | 'dark') {
  const normalized = language.trim().toLowerCase();
  const lang = codeMeta.find((meta) => meta.ext === normalized)?.language ?? normalized;
  const grammar = bundledLanguagesInfo.find((info) => info.id === lang || info.aliases?.includes(lang));
  if (!grammar) return null;

  const instance = await (highlighter ??= createHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
    langs: [],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  }).catch((error) => {
    highlighter = undefined;
    throw error;
  }));

  if (!instance.getLoadedLanguages().includes(grammar.id)) {
    await instance.loadLanguage(grammar.import);
  }

  return instance.codeToTokensBase(code, {
    lang: grammar.id,
    theme: `github-${colorScheme}`,
  });
}
