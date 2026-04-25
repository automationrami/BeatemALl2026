import { getRequestConfig } from 'next-intl/server';
import enMessages from '@beat-em-all/i18n/en';
import arMessages from '@beat-em-all/i18n/ar';
import { routing } from './routing';

type Locale = (typeof routing.locales)[number];
const isLocale = (value: string | undefined): value is Locale =>
  value !== undefined && (routing.locales as readonly string[]).includes(value);

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  ar: arMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
