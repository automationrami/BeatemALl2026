import { GAMES, getTeamBySlug } from '@beat-em-all/mock-data';
import type { GameId, TournamentStatus } from '@beat-em-all/types';

/** Western-digit grouping for money in both locales ("25,000"). */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Full game title for the italic wordmark ("VALORANT", "EA FC 25"). */
export function gameTitle(game: string): string {
  return GAMES[game as GameId]?.title ?? game;
}

/** Short game code for the hero monogram ("VAL"). */
export function gameShort(game: string): string {
  return GAMES[game as GameId]?.shortName ?? game.slice(0, 3).toUpperCase();
}

/**
 * Team crest colour. Registration rows only carry id/slug/name/tag, so reuse the
 * same mock overlay the team queries use for `accentColor` (per-entity data).
 */
export function teamCrestColor(slug: string): string | undefined {
  return getTeamBySlug(slug)?.accentColor;
}

export type StatusTagTone = 'live' | 'soft' | 'neutral';

/** Tag tone for a tournament status: live pulses, open is gold-soft, upcoming neutral. */
export function tournamentStatusTone(status: TournamentStatus | string): StatusTagTone {
  if (status === 'in_progress') return 'live';
  if (status === 'registration_open') return 'soft';
  return 'neutral';
}

export type RegistrationStatusKey =
  | 'statusPendingPayment'
  | 'statusConfirmed'
  | 'statusCheckedIn'
  | 'statusDisqualified'
  | 'statusWithdrawn';

export function registrationStatusKey(status: string): RegistrationStatusKey {
  return `status${status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')}` as RegistrationStatusKey;
}

/** Tag tone for a registration status. */
export function registrationStatusTone(status: string): 'soft' | 'info' | 'neutral' {
  if (status === 'pending_payment') return 'soft';
  if (status === 'confirmed' || status === 'checked_in') return 'info';
  return 'neutral';
}

export type TournamentLifecycleKey =
  | 'statusDraft'
  | 'upcoming'
  | 'registrationOpen'
  | 'registrationClosed'
  | 'inProgress'
  | 'completed'
  | 'cancelled';

/** `tournament.*` label key for any lifecycle status (draft … cancelled). */
export function tournamentLifecycleKey(status: string): TournamentLifecycleKey {
  switch (status) {
    case 'draft':
      return 'statusDraft';
    case 'registration_open':
      return 'registrationOpen';
    case 'registration_closed':
      return 'registrationClosed';
    case 'in_progress':
      return 'inProgress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'upcoming';
  }
}
