import type { GameId } from './game';
import type { CountryCode } from './auth';

/**
 * Tournament status — subset of the Tournament.status enum in DOMAIN_MODEL.md §9.1.
 * The Home Feed only surfaces tournaments in these surfaceable states.
 */
export type TournamentStatus = 'published' | 'registration_open' | 'in_progress';

/**
 * Tournament summary — a tightly scoped projection used by the Home Feed and Discover surfaces.
 * Maps to a subset of Tournament + PrizePool + Organization fields in DOMAIN_MODEL.md §9.
 * No invented fields: every value here is derivable from those entities.
 */
export type TournamentSummary = {
  id: string;
  slug: string;
  name: string;
  game: GameId;
  status: TournamentStatus;
  /** Display label for the human-readable starts-in moment, pre-formatted in mock seeds. */
  startsInLabel: string;
  /** Display label for the registration window or "Registration open". */
  registrationLabel: string;
  /** Total prize pool in KWD. 0 means unpaid / glory-only. */
  prizePoolKWD: number;
  /** Whether organisation that owns this tournament is Federation-tier and the tournament is sanctioned. */
  isSanctioned: boolean;
  /** Display name of the organising org (e.g. "Kuwait Esports Club"). */
  organizer: string;
  /** Hex accent for the organiser badge — KEC = cyan, third-party = violet, etc. */
  organizerAccent: string;
  /** Optional country tag — used for KW/KSA/UAE filtering on Discover screens later. */
  country: CountryCode;
  /** Cover image URL. Phase 1 leaves this null and renders a tinted placeholder. */
  coverImageUrl: string | null;
};
