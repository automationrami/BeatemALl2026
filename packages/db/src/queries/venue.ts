/**
 * Venue queries — DB-backed reads for the venue list + detail surfaces.
 *
 * Returns the canonical `VenueSummary` shape from `@beat-em-all/types`. Distance is
 * computed by the caller (Home Feed) using `haversineKm` against the viewer's location.
 */

import { eq } from 'drizzle-orm';
import type { GameId, VenueSummary } from '@beat-em-all/types';
import { getDb } from '../client';
import { venues } from '../schema/venues';
import { venueGames } from '../schema/venue_games';
import { games } from '../schema/games';

export async function listVenues(): Promise<VenueSummary[]> {
  const db = getDb();

  const rows = await db.select().from(venues).where(eq(venues.isActive, true));

  // Bulk fetch games-per-venue.
  const gameRows = await db
    .select({
      venueId: venueGames.venueId,
      gameSlug: games.slug,
    })
    .from(venueGames)
    .innerJoin(games, eq(games.id, venueGames.gameId));

  const gamesByVenue = new Map<string, GameId[]>();
  for (const g of gameRows) {
    const list = gamesByVenue.get(g.venueId) ?? [];
    list.push(g.gameSlug as GameId);
    gamesByVenue.set(g.venueId, list);
  }

  return rows
    .filter((v) => v.verificationStatus === 'verified')
    .map<VenueSummary>((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      city: v.city,
      country: v.countryCode as VenueSummary['country'],
      geo: { lat: v.latitude ?? 0, lng: v.longitude ?? 0 },
      hourlyRateKWD: v.defaultHourlyRateKwd,
      supportedGames: gamesByVenue.get(v.id) ?? [],
      rating: v.rating,
      isVerified: v.verificationStatus === 'verified',
    }));
}

export async function loadVenueBySlug(slug: string): Promise<VenueSummary | null> {
  const all = await listVenues();
  return all.find((v) => v.slug === slug) ?? null;
}
