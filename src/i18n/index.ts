import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from './locales/it.json';

export const DEFAULT_LANGUAGE = 'it';

export const resources = {
  it: { translation: it },
} as const;

// UI strings only: the words and sentences to read live in src/data.
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    // React already escapes values.
    escapeValue: false,
  },
});

export default i18n;
