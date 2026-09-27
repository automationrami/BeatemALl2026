import { desc, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '../client';
import { matchResults } from '../schema/brackets';
import { matches } from '../schema/matches';
import { teams } from '../schema/teams';
import { tournaments } from '../schema/tournaments';
import { teamAccentColor } from './team';

export type TeamResultSide = {
  slug: string;
  name: string;
  tag: string;
  accentColor: string;
  score: number;
};

export type TeamResult = {
  matchId: string;
  /** Null for challenge matches. */
  tournament: { slug: string; name: string } | null;
  playedAt: Date | null;
  home: TeamResultSide;
  away: TeamResultSide;
};

/**
 * The most recent matches with a recorded result for any of these teams, newest first.
 * Drives the results cards on team and player pages (T-03 / P-05).
 */
export async function listTeamResults(
  teamIds: readonly string[],
  limit = 8,
): Promise<TeamResult[]> {
  if (teamIds.length === 0) return [];
  const db = getDb();
  const home = alias(teams, 'home_team');
  const away = alias(teams, 'away_team');
  const rows = await db
    .select({
      matchId: matches.id,
      playedAt: matches.actualEndedAt,
      scheduledAt: matches.scheduledAt,
      recordedAt: matchResults.createdAt,
      tournamentSlug: tournaments.slug,
      tournamentName: tournaments.name,
      homeSlug: home.slug,
      homeName: home.name,
      homeTag: home.tag,
      homeScore: matchResults.homeTeamScore,
      awaySlug: away.slug,
      awayName: away.name,
      awayTag: away.tag,
      awayScore: matchResults.awayTeamScore,
    })
    .from(matchResults)
    .innerJoin(matches, eq(matches.id, matchResults.matchId))
    .innerJoin(home, eq(home.id, matches.homeTeamId))
    .innerJoin(away, eq(away.id, matches.awayTeamId))
    .leftJoin(tournaments, eq(tournaments.id, matches.tournamentId))
    .where(or(inArray(matches.homeTeamId, [...teamIds]), inArray(matches.awayTeamId, [...teamIds])))
    .orderBy(desc(matchResults.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    matchId: r.matchId,
    tournament:
      r.tournamentSlug && r.tournamentName
        ? { slug: r.tournamentSlug, name: r.tournamentName }
        : null,
    playedAt: r.playedAt ?? r.scheduledAt ?? r.recordedAt,
    home: {
      slug: r.homeSlug,
      name: r.homeName,
      tag: r.homeTag,
      accentColor: teamAccentColor(r.homeSlug, []),
      score: r.homeScore,
    },
    away: {
      slug: r.awaySlug,
      name: r.awayName,
      tag: r.awayTag,
      accentColor: teamAccentColor(r.awaySlug, []),
      score: r.awayScore,
    },
  }));
}
