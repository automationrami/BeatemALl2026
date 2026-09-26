/**
 * Kuwait-time helpers for the organiser forms. Kuwait is UTC+3 all year (no DST), so a
 * `<input type="datetime-local">` value is read and written as Kuwait wall-clock time
 * regardless of the organiser's device time zone.
 */

const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Date → `YYYY-MM-DDTHH:MM` in Kuwait time (for datetime-local inputs). */
export function toKuwaitInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + KUWAIT_OFFSET_MS).toISOString().slice(0, 16);
}

/** `YYYY-MM-DDTHH:MM` (Kuwait wall clock) → ISO string, or null when empty/invalid. */
export function fromKuwaitInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** BCP-47 tag with Latin digits in both languages. */
export function dateLocaleFor(locale: string): string {
  return locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB';
}

/** "12 Oct 2026, 18:00" in Kuwait time. */
export function formatKuwaitDateTime(value: Date | string | null | undefined, locale: string) {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(dateLocaleFor(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuwait',
  }).format(d);
}
