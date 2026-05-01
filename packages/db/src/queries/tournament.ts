/**
 * Tournament queries — DB-backed reads for the Tournaments list + detail surfaces.
 *
 * Returns the canonical `TournamentSummary` shape. Joins to `games` for the game slug
 * and to `organizations` for the organizer name + accent.
 */

import { eq, inArray } from 'drizzle-orm';
import type { GameId, TournamentStatus, TournamentSummary } from '@beat-em-all/types';
import type { CountryCode } from '@beat-em-all/types';
import { getDb } from '../client';
import { tournaments } from '../schema/tournaments';
import { games } from '../schema/games';
import { organizations } from '../schema/organizations';

const SURFACEABLE_STATUSES: TournamentStatus[] = ['published', 'registration_open', 'in_progress'];

export async function listSurfaceableTournaments(): Promise<TournamentSummary[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: tournaments.id,
      slug: tournaments.slug,
      name: tournaments.name,
      status: tournaments.status,
      startsInLabel: tournaments.startsInLabel,
      registrationLabel: tournaments.registrationLabel,
      prizePoolKwd: tournaments.prizePoolKwd,
      isOfficialSanctioned: tournaments.isOfficialSanctioned,
      gameSlug: games.slug,
      organizerName: organizations.name,
      organizerAccent: organizations.accentColor,
      organizerCountry: organizations.countryCode,
      coverImageUrl: tournaments.coverImageUrl,
    })
    .from(tournaments)
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(inArray(tournaments.status, SURFACEABLE_STATUSES));

  return rows.map<TournamentSummary>((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    game: r.gameSlug as GameId,
    status: r.status as TournamentStatus,
    startsInLabel: r.startsInLabel ?? '',
    registrationLabel: r.registrationLabel ?? '',
    prizePoolKWD: r.prizePoolKwd,
    isSanctioned: r.isOfficialSanctioned,
    organizer: r.organizerName,
    organizerAccent: r.organizerAccent ?? '#A78BFA',
    country: r.organizerCountry as CountryCode,
    coverImageUrl: r.coverImageUrl,
  }));
}

export async function loadTournamentBySlug(slug: string): Promise<TournamentSummary | null> {
  const db = getDb();
  const all = await listSurfaceableTournaments();
  const found = all.find((t) => t.slug === slug);
  if (found) return found;

  // Fallback: look up tournaments outside the surfaceable status set (draft, completed, etc.)
  const rows = await db
    .select({
      id: tournaments.id,
      slug: tournaments.slug,
      name: tournaments.name,
      status: tournaments.status,
      startsInLabel: tournaments.startsInLabel,
      registrationLabel: tournaments.registrationLabel,
      prizePoolKwd: tournaments.prizePoolKwd,
      isOfficialSanctioned: tournaments.isOfficialSanctioned,
      gameSlug: games.slug,
      organizerName: organizations.name,
      organizerAccent: organizations.accentColor,
      organizerCountry: organizations.countryCode,
      coverImageUrl: tournaments.coverImageUrl,
    })
    .from(tournaments)
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(eq(tournaments.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    game: row.gameSlug as GameId,
    status: row.status as TournamentStatus,
    startsInLabel: row.startsInLabel ?? '',
    registrationLabel: row.registrationLabel ?? '',
    prizePoolKWD: row.prizePoolKwd,
    isSanctioned: row.isOfficialSanctioned,
    organizer: row.organizerName,
    organizerAccent: row.organizerAccent ?? '#A78BFA',
    country: row.organizerCountry as CountryCode,
    coverImageUrl: row.coverImageUrl,
  };
}
