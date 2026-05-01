/**
 * Player queries — DB-backed reads that the API route + Server Components share.
 *
 * **Hybrid strategy (Phase 1):** The DB has core identity (users + players + player_games)
 * but does NOT yet have the rich profile data the frontend uses (pentagon stats, recent
 * matches, achievements, linked accounts, calculated stats, badges). For now, the query
 * merges DB-backed core fields with mock-data lookups for the rich fields. As subsequent
 * epics ship those tables (matches, achievements, etc.), the mock fallbacks get replaced
 * one at a time.
 *
 * In the meantime, the API contract returned to the frontend is the canonical
 * `PlayerProfile` shape from `@beat-em-all/types`. Frontend code is unchanged.
 */

import { eq } from 'drizzle-orm';
import type { GameId, PlayerProfile } from '@beat-em-all/types';
import { getPlayerProfileBySlug as getMockPlayerProfileBySlug } from '@beat-em-all/mock-data';
import { getDb } from '../client';
import { users } from '../schema/users';
import { players } from '../schema/players';
import { playerGames } from '../schema/player_games';
import { games } from '../schema/games';

/**
 * Load the full PlayerProfile for a given slug. Returns null if no player exists.
 *
 * Server-only — pulls from Postgres + falls back to mock-data for fields not yet modelled.
 */
export async function loadPlayerProfileBySlug(slug: string): Promise<PlayerProfile | null> {
  const db = getDb();

  // 1. Core identity from DB.
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      phoneVerifiedAt: users.phoneVerifiedAt,
      userCreatedAt: users.createdAt,
      playerId: players.id,
      slug: players.slug,
      countryCode: players.countryCode,
      city: players.city,
      bio: players.bio,
      civilIdVerifiedAt: players.civilIdVerifiedAt,
      isProfilePublic: players.isProfilePublic,
    })
    .from(players)
    .innerJoin(users, eq(users.id, players.userId))
    .where(eq(players.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // 2. Game ids the player competes in.
  const gameRows = await db
    .select({ slug: games.slug })
    .from(playerGames)
    .innerJoin(games, eq(games.id, playerGames.gameId))
    .where(eq(playerGames.playerId, row.playerId));

  const gameSlugs = gameRows.map((g) => g.slug as GameId);

  // 3. Pull the rich profile from mock-data (pentagon, stats, recent matches, etc.) and
  //    overlay the DB-backed identity on top so the canonical fields ALWAYS reflect Postgres.
  const mock = getMockPlayerProfileBySlug(slug);

  const profile: PlayerProfile = {
    // Core (DB-backed)
    personaId: mock?.personaId ?? slug,
    displayName: row.displayName,
    slug: row.slug,
    bio: row.bio ?? mock?.bio ?? '',
    country: row.countryCode,
    city: row.city ?? mock?.city ?? '',
    joinedLabel: formatJoinedLabel(row.userCreatedAt),
    handle: mock?.handle ?? `@${slug.replace(/-/g, '_')}`,
    civilIdVerified: row.civilIdVerifiedAt !== null,
    avatarColor: mock?.avatarColor ?? '#8B5CF6',
    games: gameSlugs,

    // Rich (mock-data fallback until subsequent epics model these)
    stats: mock?.stats ?? defaultStats(),
    pentagon: mock?.pentagon ?? defaultPentagon(gameSlugs[0] ?? 'eafc'),
    recentMatches: mock?.recentMatches ?? [],
    achievements: mock?.achievements ?? [],
    linkedAccounts: mock?.linkedAccounts ?? [],
    badges: mock?.badges ?? [],
  };

  return profile;
}

function formatJoinedLabel(createdAt: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[createdAt.getUTCMonth()];
  const year = createdAt.getUTCFullYear();
  return `${month} ${year}`;
}

function defaultStats(): PlayerProfile['stats'] {
  return {
    winRate90d: 0,
    rating: 0,
    ratingDelta30d: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    currentStreak: { count: 0, streakType: 'W' },
    recentResults: [],
    prizeWonKWD: 0,
    tournamentsWon: 0,
    top3Finishes: 0,
  };
}

function defaultPentagon(game: GameId): PlayerProfile['pentagon'] {
  return {
    game,
    axes: [
      { label: 'AIM', value: 0 },
      { label: 'GAME', value: 0 },
      { label: 'TEAM', value: 0 },
      { label: 'CLUTCH', value: 0 },
      { label: 'CONS.', value: 0 },
    ],
    overallRating: 0,
    sampleSize: 0,
  };
}
