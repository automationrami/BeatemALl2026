// @beat-em-all/i18n — English + Arabic translation files for the platform.
// Consumed by next-intl in apps/web and apps/admin. Add new keys here, never inline strings in components.
export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
