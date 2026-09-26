/** Opening-hours display shared by the venue pages (server-safe, no React). */

type Translate = (key: string, values?: Record<string, string>) => string;

export type VenueHours = { opensAtTime: string; closesAtTime: string; isOpen24h: boolean };

/** "12:00 – 02:00" or "Open 24 hours", from the `venueOwner` namespace. */
export function openingHoursText(t: Translate, v: VenueHours): string {
  if (v.isOpen24h) return t('hours.open24h');
  return t('hours.range', { open: v.opensAtTime.slice(0, 5), close: v.closesAtTime.slice(0, 5) });
}
