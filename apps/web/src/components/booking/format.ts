/**
 * Display helpers shared by the venue + booking surfaces.
 *
 * Western digits in both locales (`-u-nu-latn`), Kuwait time for every booking slot.
 */

const KWD_NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

/** Grouped amount without the currency, e.g. `1,500` or `7.5`. Wrap with the `money` key. */
export function formatAmount(amount: number): string {
  return KWD_NUMBER.format(amount);
}

/** BCP-47 tag for date formatting with Latin digits in both languages. */
export function dateLocale(locale: string): string {
  return locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB';
}

/** Two- or three-letter monogram for a venue name ("GG Arena" -> "GA"). */
export function venueInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}
