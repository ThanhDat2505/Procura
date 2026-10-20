import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { AppLocale } from '@/domain/format';

/**
 * Vietnamese is the default language; English can be switched on from the header or SET-01.
 * Every `locales/<lang>/<namespace>.json` file is picked up automatically, so a feature only needs to
 * add its own namespace file (and use `useTranslation('<namespace>')`).
 */
const files = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', { eager: true, import: 'default' });

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, content] of Object.entries(files)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  resources[lng] ??= {};
  resources[lng][ns] = content;
}

export const SUPPORTED_LANGUAGES: AppLocale[] = ['vi', 'en'];
const STORAGE_KEY = 'procura.lang';

function initialLanguage(): AppLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    // Storage unavailable.
  }
  return 'vi';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'vi',
  defaultNS: 'common',
  ns: Object.keys(resources.vi ?? {}),
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Storage unavailable.
  }
});
document.documentElement.lang = i18n.language;

export function setLanguage(lng: AppLocale): void {
  void i18n.changeLanguage(lng);
}

export default i18n;
