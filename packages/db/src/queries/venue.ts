/**
 * Venue queries — DB-backed reads for the venue list + detail surfaces.
 *
 * Returns the canonical `VenueSummary` shape from `@beat-em-all/types`. Distance is
 * computed by the caller (Home Feed) using `haversineKm` against the viewer's location.
 *
 * Only live venues (verified by Beat'Em All, accepting bookings, not deleted) are public
 * (E3 US-3.3). Pending and rejected applications are visible to their managers only.
 */

import { and, eq, isNull } from 'drizzle-orm';
import type { GameId, VenueSummary } from '@beat-em-all/types';
import { getDb } from '../client';
import { venues, type VenueRow } from '../schema/venues';
import { venueGames } from '../schema/venue_games';
import { games } from '../schema/games';

/** Kuwait is UTC+3 all year (no DST). Opening hours are stored in Kuwait local time. */
const KUWAIT_OFFSET_MINUTES = 180;
const DAY_MINUTES = 24 * 60;

/** Live = approved by Beat'Em All, the "accepting bookings" switch on, and not deleted. */
export function isVenueLive(
  v: Pick<VenueRow, 'verificationStatus' | 'isActive' | 'deletedAt'>,
): boolean {
  return v.verificationStatus === 'verified' && v.isActive && !v.deletedAt;
}

/** `'14:30:00'` / `'14:30'` → minutes after midnight. */
function timeToMinutes(value: string): number {
  const [h, m] = value.split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

/** `'14:30:00'` → `'14:30'`. */
export function formatVenueTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * Does the whole slot [startAt, endAt) fall inside one of the venue's daily opening windows?
 * Hours are Kuwait local; a close at or before the open runs past midnight (12:00–02:00).
 */
export function fitsOpeningHours(
  hours: Pick<VenueRow, 'opensAtTime' | 'closesAtTime' | 'isOpen24h'>,
  startAt: Date,
  endAt: Date,
): boolean {
  if (hours.isOpen24h) return true;
  const open = timeToMinutes(hours.opensAtTime);
  const close = timeToMinutes(hours.closesAtTime);
  const windowLength = (close - open + DAY_MINUTES) % DAY_MINUTES;
  if (windowLength === 0) return true; // open == close reads as round-the-clock
  const startMinutes =
    (Math.floor(startAt.getTime() / 60_000) + KUWAIT_OFFSET_MINUTES) % DAY_MINUTES;
  const duration = Math.ceil((endAt.getTime() - startAt.getTime()) / 60_000);
  const offsetIntoWindow = (startMinutes - open + DAY_MINUTES) % DAY_MINUTES;
  return offsetIntoWindow + duration <= windowLength;
}

async function gamesByVenueId(venueId?: string): Promise<Map<string, GameId[]>> {
  const gameRows = await getDb()
    .select({ venueId: venueGames.venueId, gameSlug: games.slug })
    .from(venueGames)
    .innerJoin(games, eq(games.id, venueGames.gameId))
    .where(venueId ? eq(venueGames.venueId, venueId) : undefined);
  const out = new Map<string, GameId[]>();
  for (const g of gameRows) {
    const list = out.get(g.venueId) ?? [];
    list.push(g.gameSlug as GameId);
    out.set(g.venueId, list);
  }
  return out;
}

export function toVenueSummary(v: VenueRow, supportedGames: GameId[]): VenueSummary {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    city: v.city,
    country: v.countryCode as VenueSummary['country'],
    geo: { lat: v.latitude ?? 0, lng: v.longitude ?? 0 },
    hourlyRateKWD: v.defaultHourlyRateKwd,
    supportedGames,
    rating: v.rating,
    isVerified: v.verificationStatus === 'verified',
  };
}

export async function listVenues(): Promise<VenueSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(venues)
    .where(
      and(
        eq(venues.isActive, true),
        eq(venues.verificationStatus, 'verified'),
        isNull(venues.deletedAt),
      ),
    );
  const gamesByVenue = await gamesByVenueId();
  return rows.filter(isVenueLive).map((v) => toVenueSummary(v, gamesByVenue.get(v.id) ?? []));
}

/** Public detail: live venues only. */
export async function loadVenueBySlug(slug: string): Promise<VenueSummary | null> {
  const row = await loadVenueRecordBySlug(slug);
  if (!row || !isVenueLive(row)) return null;
  const gamesByVenue = await gamesByVenueId(row.id);
  return toVenueSummary(row, gamesByVenue.get(row.id) ?? []);
}

/** The raw venue row in any review state (not deleted). Callers decide who may see it. */
export async function loadVenueRecordBySlug(slug: string): Promise<VenueRow | null> {
  const [row] = await getDb()
    .select()
    .from(venues)
    .where(and(eq(venues.slug, slug), isNull(venues.deletedAt)))
    .limit(1);
  return row ?? null;
}
