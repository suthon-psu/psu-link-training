import { createIntl, createIntlCache } from 'react-intl';
import enMessages from './locales/en.json';
import thMessages from './locales/th.json';

export const locales = ['en', 'th'] as const;
export type Locale = typeof locales[number];

export const messages = {
  en: enMessages,
  th: thMessages,
};

const cache = createIntlCache();

export function createIntlInstance(locale: Locale) {
  return createIntl(
    {
      locale,
      messages: messages[locale],
    },
    cache
  );
}

export function getDefaultLocale(): Locale {
  return 'en';
}

export function detectLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];
    return locales.includes(browserLang as Locale) ? (browserLang as Locale) : getDefaultLocale();
  }
  return getDefaultLocale();
}