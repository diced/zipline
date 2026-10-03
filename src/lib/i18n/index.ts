import dayjs from 'dayjs';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/ja';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh-cn';
import { useSettingsStore } from '@/lib/client/store/settings';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DAYJS_LOCALES, DEFAULT_LANGUAGE, isLanguage, Language, LANGUAGES, matchLanguage } from './languages';
import { Resources, resources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: Resources;
  }
}

function readStoredLanguage(): Language | null {
  const stored = useSettingsStore.getState().settings.language;
  return isLanguage(stored) ? stored : null;
}

// the server always renders english, the browser picks: stored choice > browser languages > english
export function detectLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  const stored = readStoredLanguage();
  if (stored) return stored;

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of candidates) {
    if (!tag) continue;

    const lng = matchLanguage(tag);
    if (lng) return lng;
  }

  return DEFAULT_LANGUAGE;
}

function applyLanguage(lng: string) {
  const language = isLanguage(lng) ? lng : DEFAULT_LANGUAGE;

  dayjs.locale(DAYJS_LOCALES[language]);
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

// only an explicit choice is persisted, so auto-detection keeps following the browser until then
export function setLanguage(lng: Language) {
  const changed = i18n.changeLanguage(lng);

  try {
    useSettingsStore.getState().update('language', lng);
  } catch {
    // storage may be full or blocked, the choice then lasts for this page only
  }

  return changed;
}

export function currentLanguage(): Language {
  return isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  i18n.on('languageChanged', applyLanguage);

  i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES,
    defaultNS: 'common',
    ns: Object.keys(resources[DEFAULT_LANGUAGE] ?? {}),
    // a missing or empty translation falls back to english instead of rendering blank
    returnNull: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    initAsync: false,
    react: { useSuspense: false },
  });

  applyLanguage(i18n.language);
}

export default i18n;
