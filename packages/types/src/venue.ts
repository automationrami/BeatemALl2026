import type { GameId } from './game';
import type { CountryCode } from './auth';
import type { GeoPoint } from './geo';

/**
 * Venue summary — a tightly scoped projection used by the Home Feed and Discover Venues surfaces.
 * Maps to a subset of Venue + VenueGame fields in DOMAIN_MODEL.md §6.
 *
 * Note on `rating`: the canonical Venue entity does NOT have a rating field today (reviews are
 * deferred per EPICS.md). Mock seeds may supply a number; the Home Feed treats `null` as
 * "no rating yet" and renders the price pill on its own.
 */
export type VenueSummary = {
  id: string;
  slug: string;
  name: string;
  city: string;
  /** Country accent — drives the country-flag pill colour. */
  country: CountryCode;
  /** Geo coords — used to compute distance from the viewer. */
  geo: GeoPoint;
  /** Hourly rate per seat in KWD. */
  hourlyRateKWD: number;
  /** Top supported games at this venue (capped at 3 for the row badge). */
  supportedGames: GameId[];
  /** Optional star rating, 0-5 with one decimal. Null if no reviews yet (Phase 1 + most of MVP). */
  rating: number | null;
  /** Verified flag — only `verification_status = 'verified'` venues appear on Home. */
  isVerified: boolean;
};
