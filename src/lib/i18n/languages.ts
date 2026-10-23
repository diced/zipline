export const LANGUAGE_NAMES = {
  en: 'English',
  zh: '简体中文',
  ja: '日本語',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  ru: 'Русский',
  tr: 'Türkçe',
  nl: 'Nederlands',
  it: 'Italiano',
  ro: 'Română',
} as const;

export type Language = keyof typeof LANGUAGE_NAMES;

export const LANGUAGES = Object.keys(LANGUAGE_NAMES) as Language[];
export const DEFAULT_LANGUAGE: Language = 'en';

const DAYJS_OVERRIDES: Partial<Record<Language, string>> = {
  zh: 'zh-cn',
  pt: 'pt-br',
};

export function getDayjsLocale(language: Language): string {
  return DAYJS_OVERRIDES[language] ?? language;
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(LANGUAGE_NAMES, value);
}

export function matchLanguage(tag: string): Language | null {
  const base = tag.toLowerCase().split(/[-_]/)[0];

  return isLanguage(base) ? base : null;
}
