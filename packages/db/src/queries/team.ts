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

import { eq } from 'drizzle-orm';
import type { GameId, Team, TeamMember, TeamRole } from '@beat-em-all/types';
import { getTeamBySlug as getMockTeamBySlug, GAMES } from '@beat-em-all/mock-data';
import { getDb } from '../client';
import { teams } from '../schema/teams';
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
