/**
 * Presentation helpers shared by the challenges inbox and the challenge detail page.
 * Pure functions: no data access, safe in server and client components.
 */

export type ChallengeStatusKey =
  | 'statusPending'
  | 'statusNegotiating'
  | 'statusAccepted'
  | 'statusRejected'
  | 'statusExpired'
  | 'statusCancelled'
  | 'statusBooked';

export type ChallengeTagTone = 'soft' | 'info' | 'paper' | 'neutral';

/** i18n key (in the `challenge` namespace) for a challenge status. */
export function challengeStatusKey(status: string): ChallengeStatusKey {
  return `status${status.charAt(0).toUpperCase() + status.slice(1)}` as ChallengeStatusKey;
}

/** Tag tone for a status: open states stand out, closed ones recede. */
export function challengeStatusTone(status: string): ChallengeTagTone {
  if (status === 'pending') return 'soft';
  if (status === 'negotiating') return 'info';
  if (status === 'accepted' || status === 'booked') return 'paper';
  return 'neutral';
}

/** Intl locale with Western digits in both languages. */
export function intlLocale(locale: string): string {
  return locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB';
}

/** Short day + date window, e.g. "Fri 2 Oct – Sun 4 Oct", in Kuwait time. */
export function formatDayRange(locale: string, start: Date, end: Date): string {
  const f = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kuwait',
  });
  return f.formatRange(start, end);
}

/** Full date + time, e.g. "2 Oct 2026, 19:00", in Kuwait time. */
export function formatDateTime(locale: string, date: Date): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuwait',
  }).format(date);
}
