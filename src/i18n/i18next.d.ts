import type { resources } from './index';

// Type-checked translation keys: t('settings.title') is fine,
// t('settings.titel') is a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['it'];
  }
}
