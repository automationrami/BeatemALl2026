/**
 * Team queries — DB-backed reads with mock-data overlay for not-yet-modelled fields.
 *
 * Phase-1 hybrid (same pattern as `loadPlayerProfileBySlug`):
 *   - DB provides: team identity, real persona memberships, supported games
 *   - Mock-data provides: stats (rating, winRate, trophies), upcomingMatch, full mock roster
 *     for teams whose mock has more members than the DB has personas
 *
 * As subsequent epics ship `match_results`, `team_stats_cache`, etc., the mock fallback
 * for those fields gets replaced one at a time.
 */

import { eq, inArray } from 'drizzle-orm';
import type { GameId, Team, TeamMember, TeamRole } from '@beat-em-all/types';
import { getTeamBySlug as getMockTeamBySlug, GAMES } from '@beat-em-all/mock-data';
import { getDb } from '../client';
import { teams } from '../schema/teams';
import type { TeamRow } from '../schema/teams';
import { teamMembers } from '../schema/team_members';
import { teamGames } from '../schema/team_games';
import { games } from '../schema/games';
import { players } from '../schema/players';
import { users } from '../schema/users';

export async function loadTeamBySlug(slug: string): Promise<Team | null> {
  const db = getDb();

  const teamRows = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);

  const teamRow = teamRows[0];
  if (!teamRow) return null;

  const gameRows = await db
    .select({ slug: games.slug, isPrimary: teamGames.isPrimary })
    .from(teamGames)
    .innerJoin(games, eq(games.id, teamGames.gameId))
    .where(eq(teamGames.teamId, teamRow.id));

  const gameSlugs = gameRows.map((g) => g.slug as GameId);

  const memberRows = await db
    .select({
      playerSlug: players.slug,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: teamMembers.role,
      inGameRole: teamMembers.inGameRole,
    })
    .from(teamMembers)
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .innerJoin(users, eq(users.id, players.userId))
    .where(eq(teamMembers.teamId, teamRow.id));

  // Hybrid: pull mock to fill in stats/upcomingMatch/mock roster.
  const mock = getMockTeamBySlug(slug);

  // Real DB members override the same-slug mock entries; rest of the mock roster fills in.
  const dbMembers: TeamMember[] = memberRows.map((m) => {
    const mockMember = mock?.members.find((mm) => mm.playerSlug === m.playerSlug);
    return {
      playerSlug: m.playerSlug,
      displayName: m.displayName,
      role: dbRoleToType(m.role),
      inGameRole: m.inGameRole ?? mockMember?.inGameRole ?? '',
      rating: mockMember?.rating ?? 1500,
      avatarColor: mockMember?.avatarColor ?? '#8B5CF6',
    };
  });
  const dbMemberSlugSet = new Set(dbMembers.map((m) => m.playerSlug));
  const mockOnlyMembers: TeamMember[] =
    mock?.members.filter((m) => !dbMemberSlugSet.has(m.playerSlug)) ?? [];

  const team: Team = {
    id: teamRow.id,
    slug: teamRow.slug,
    tag: teamRow.tag,
    name: teamRow.name,
    country: teamRow.countryCode,
    city: teamRow.city ?? '',
    accentColor: mock?.accentColor ?? brandColorFor(gameSlugs),
    games: gameSlugs,
    recruiting: teamRow.isRecruiting,
    bio: teamRow.bio ?? '',
    joinedLabel: formatFoundedLabel(teamRow.foundedAt),
    badges: mock?.badges ?? [],
    members: [...dbMembers, ...mockOnlyMembers],
    stats: mock?.stats ?? defaultStats(),
    upcomingMatch: mock?.upcomingMatch ?? null,
  };

  return team;
}

function dbRoleToType(
  role: 'captain' | 'co_captain' | 'starter' | 'substitute' | 'coach' | 'manager',
): TeamRole {
  // The Team types currently use `sub` instead of `substitute` (and don't yet have `manager`).
  // Map cleanly for now; align in a follow-up when E2 stories model this in `packages/types/team.ts`.
  if (role === 'substitute') return 'sub';
  if (role === 'manager') return 'coach';
  return role as TeamRole;
}

function brandColorFor(gameSlugs: GameId[]): string {
  const primary = gameSlugs[0];
  if (primary && GAMES[primary]) return GAMES[primary].brandColor;
  return '#8B5CF6';
}

function formatFoundedLabel(foundedAt: string | null): string {
  if (!foundedAt) return '';
  const d = new Date(foundedAt);
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
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function defaultStats(): Team['stats'] {
  return {
    winRate: 0,
    totalMatches: 0,
    trophies: 0,
    rating: 1500,
    ratingDelta30d: 0,
    streak: { count: 0, streakType: 'W' },
  };
}

/**
 * Create a team. Atomic: inserts `teams` + `team_members` (captain) + `team_games` rows
 * in one transaction. The caller (API route) is expected to have resolved the active
 * persona and pass `byPlayerId`.
 *
 * Validation:
 *   - name: 2–60 chars
 *   - tag: 2–6 uppercase alphanumeric characters (per DOMAIN_MODEL.md §4.1)
 *   - slug: 3–40 lowercase alphanumerics + hyphens, must be unique
 *   - countryCode: 2-letter ISO
 *   - gameSlugs: at least one, all must exist in `games`
 *
 * NOTE: a player CAN be on multiple teams across different games (per DOMAIN_MODEL.md
 * §4.2), so we do not block creation if the persona already captains another team. The
 * persona-cookie auth proxy uses `teamMemberships[0]` (slug-ordered) for the booking +
 * challenge flows; multi-team picker is a follow-up.
 */
export async function createTeam(input: {
  byPlayerId: string;
  name: string;
  tag: string;
  slug: string;
  countryCode: string;
  city?: string | null;
  bio?: string | null;
  isRecruiting?: boolean;
  gameSlugs: string[];
}): Promise<TeamRow> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) {
    throw new TeamError('invalid_name', 'Team name must be between 2 and 60 characters.');
  }
  const tag = input.tag.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,6}$/.test(tag)) {
    throw new TeamError(
      'invalid_tag',
      'Team tag must be 2–6 uppercase letters or digits, no spaces.',
    );
  }
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) || slug.includes('--')) {
    throw new TeamError(
      'invalid_slug',
      'Slug must be 3–40 lowercase letters, digits or hyphens; no leading/trailing hyphen and no consecutive hyphens.',
    );
  }
  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(countryCode)) {
    throw new TeamError('invalid_country', 'Country code must be 2–3 letters (e.g. KW).');
  }
  // Dedupe the games list — duplicates would otherwise either (a) trip the
  // length-equality check at line 221 with a confusing "unknown_game" message, or
  // (b) hit the team_games unique constraint mid-transaction. Both produce bad UX.
  const gameSlugs = Array.from(new Set(input.gameSlugs));
  if (gameSlugs.length === 0) {
    throw new TeamError('no_games', 'Pick at least one game your team plays.');
  }

  const db = getDb();

  // Validate the player exists.
  const [playerRow] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.id, input.byPlayerId))
    .limit(1);
  if (!playerRow) throw new TeamError('forbidden', 'Active persona has no player record.');

  // Validate slug not already taken (the unique index will catch races, but a clean
  // 409 is much friendlier than a Postgres unique-violation message bubbling up).
  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);
  if (existing) {
    throw new TeamError('slug_taken', `The slug "${slug}" is already in use. Pick another.`);
  }

  // Resolve game ids from slugs.
  const gameRows = await db
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(inArray(games.slug, gameSlugs));
  if (gameRows.length !== gameSlugs.length) {
    const found = new Set(gameRows.map((g) => g.slug));
    const missing = gameSlugs.filter((s) => !found.has(s));
    throw new TeamError('unknown_game', `Unknown game slug(s): ${missing.join(', ')}`);
  }

  // Atomic create: team + captain membership + team_games. The `teams.slug` unique
  // index is also our race-safety net here: the SELECT pre-check above is a TOCTOU
  // window, so we additionally translate Postgres `23505` violations on the team
  // insert into a clean `slug_taken` 409 instead of leaking a 500.
  try {
    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(teams)
        .values({
          slug,
          name,
          tag,
          countryCode,
          city: input.city?.trim() || null,
          bio: input.bio?.trim() || null,
          isPublic: true,
          isRecruiting: input.isRecruiting ?? false,
        })
        .returning();
      const team = inserted[0];
      if (!team) throw new TeamError('insert_failed', 'Team insert returned no row.');

      await tx.insert(teamMembers).values({
        teamId: team.id,
        playerId: input.byPlayerId,
        role: 'captain',
        invitationStatus: 'accepted',
      });

      for (let i = 0; i < gameRows.length; i++) {
        const g = gameRows[i];
        if (!g) continue;
        await tx.insert(teamGames).values({
          teamId: team.id,
          gameId: g.id,
          isPrimary: i === 0,
        });
      }

      return team;
    });
  } catch (err) {
    if (err instanceof TeamError) throw err;
    if (typeof err === 'object' && err && (err as { code?: string }).code === '23505') {
      throw new TeamError('slug_taken', `The slug "${slug}" is already in use. Pick another.`);
    }
    throw err;
  }
}

/**
 * The set of games available for a persona to register a team in. Returns the full game
 * catalog ordered with the persona's own games first, marked with `isPlayed`. The
 * create-team form uses this to default-pick the persona's primary game.
 */
export async function listGamesForCreateTeam(
  byPlayerId: string,
): Promise<{ slug: string; name: string; isPlayed: boolean }[]> {
  const db = getDb();
  const { playerGames } = await import('../schema/player_games');

  const allGames = await db
    .select({ id: games.id, slug: games.slug, name: games.name, isActive: games.isActive })
    .from(games);

  const playedRows = await db
    .select({ gameId: playerGames.gameId })
    .from(playerGames)
    .where(eq(playerGames.playerId, byPlayerId));
  const played = new Set(playedRows.map((r) => r.gameId));

  return allGames
    .filter((g) => g.isActive)
    .map((g) => ({ slug: g.slug, name: g.name, isPlayed: played.has(g.id) }))
    .sort((a, b) => {
      if (a.isPlayed && !b.isPlayed) return -1;
      if (!a.isPlayed && b.isPlayed) return 1;
      return a.name.localeCompare(b.name);
    });
}

export class TeamError extends Error {
  constructor(
    public code:
      | 'invalid_name'
      | 'invalid_tag'
      | 'invalid_slug'
      | 'invalid_country'
      | 'no_games'
      | 'unknown_game'
      | 'slug_taken'
      | 'forbidden'
      | 'insert_failed',
    message: string,
  ) {
    super(message);
    this.name = 'TeamError';
  }
}
