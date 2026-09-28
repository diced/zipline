export const LANGUAGES = ['en', 'zh', 'ja', 'fr', 'de', 'es', 'pt', 'ru'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'zipline-language';

// native names are intentionally not translated, so a user can always find their own language
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  zh: '简体中文',
  ja: '日本語',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  ru: 'Русский',
};

export const DAYJS_LOCALES: Record<Language, string> = {
  en: 'en',
  zh: 'zh-cn',
  ja: 'ja',
  fr: 'fr',
  de: 'de',
  es: 'es',
  pt: 'pt-br',
  ru: 'ru',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function matchLanguage(tag: string): Language | null {
  const base = tag.toLowerCase().split(/[-_]/)[0];

  return isLanguage(base) ? base : null;
}
