import type { CountryDialCode } from '@beat-em-all/types';

/** GCC country dial codes — covers MVP launch markets. */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { country: 'KW', flag: '🇰🇼', dial: '965', label: { en: 'Kuwait', ar: 'الكويت' } },
  { country: 'KSA', flag: '🇸🇦', dial: '966', label: { en: 'Saudi Arabia', ar: 'السعودية' } },
  { country: 'AE', flag: '🇦🇪', dial: '971', label: { en: 'United Arab Emirates', ar: 'الإمارات' } },
  { country: 'BH', flag: '🇧🇭', dial: '973', label: { en: 'Bahrain', ar: 'البحرين' } },
  { country: 'QA', flag: '🇶🇦', dial: '974', label: { en: 'Qatar', ar: 'قطر' } },
  { country: 'OM', flag: '🇴🇲', dial: '968', label: { en: 'Oman', ar: 'عُمان' } },
];

/** Kuwait — launch market. Non-null because the array is statically populated. */
export const DEFAULT_COUNTRY: CountryDialCode = {
  country: 'KW',
  flag: '🇰🇼',
  dial: '965',
  label: { en: 'Kuwait', ar: 'الكويت' },
};
