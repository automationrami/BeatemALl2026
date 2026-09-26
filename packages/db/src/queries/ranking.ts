/**
 * Ranking queries — FED-1 US-FED1.4 "public ranking leaderboard per federation, per game,
 * per season". Built from `ranking_points` (DOMAIN_MODEL.md §11.3).
 *
 * Movement ("change since last update") is the difference between a team's rank now and
 * its rank before the most recent tournament that awarded points in the same scope.
 */

import { and, desc, eq, inArray } from 'drizzle-orm';
import { getTeamBySlug as getMockTeamBySlug } from '@beat-em-all/mock-data';
import { getDb } from '../client';
import { games } from '../schema/games';
import { organizations } from '../schema/organizations';
import { rankingPoints } from '../schema/ranking_points';
import { teams } from '../schema/teams';
import { tournaments } from '../schema/tournaments';

export type TeamRankingRow = {
  rank: number;
  /** Positive = moved up since the last event, negative = down, 0 = held or new. */
  delta: number;
  teamId: string;
  slug: string;
  name: string;
  tag: string;
  accentColor: string;
  city: string | null;
  countryCode: string;
  points: number;
  medals: { gold: number; silver: number; bronze: number };
  tournaments: number;
};

export type TeamRankings = {
  season: string;
  organization: { slug: string; name: string; tier: string } | null;
  game: { slug: string; name: string } | null;
  /** Games that have points in this scope — drives the per-game tabs. */
  games: { slug: string; name: string }[];
  rows: TeamRankingRow[];
  stats: {
    tournaments: number;
    prizePoolKwd: number;
    teams: number;
    medals: number;
    pointsAwarded: number;
  };
  lastEvent: { slug: string; name: string; endsAt: string | null } | null;
};

const GOLD_FALLBACK = '#987C4B';

export async function loadTeamRankings(opts: {
  season: string;
  organizationSlug: string;
  gameSlug?: string | null;
}): Promise<TeamRankings> {
  const db = getDb();

  const [org] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      tier: organizations.tier,
    })
    .from(organizations)
    .where(eq(organizations.slug, opts.organizationSlug))
    .limit(1);

  const empty: TeamRankings = {
    season: opts.season,
    organization: org ? { slug: org.slug, name: org.name, tier: org.tier } : null,
    game: null,
    games: [],
    rows: [],
    stats: { tournaments: 0, prizePoolKwd: 0, teams: 0, medals: 0, pointsAwarded: 0 },
    lastEvent: null,
  };
  if (!org) return empty;

  const all = await db
    .select({
      recipientId: rankingPoints.recipientId,
      points: rankingPoints.points,
      placement: rankingPoints.placement,
      tournamentId: rankingPoints.tournamentId,
      tournamentSlug: tournaments.slug,
      tournamentName: tournaments.name,
      prizePoolKwd: tournaments.prizePoolKwd,
      endsAt: tournaments.endsAt,
      gameSlug: games.slug,
      gameName: games.name,
    })
    .from(rankingPoints)
    .innerJoin(tournaments, eq(tournaments.id, rankingPoints.tournamentId))
    .innerJoin(games, eq(games.id, rankingPoints.gameId))
    .where(
      and(
        eq(rankingPoints.season, opts.season),
        eq(rankingPoints.awardedByOrganizationId, org.id),
        eq(rankingPoints.recipientType, 'team'),
      ),
    )
    .orderBy(desc(tournaments.endsAt));

  const gameList = [
    ...new Map(all.map((r) => [r.gameSlug, { slug: r.gameSlug, name: r.gameName }])).values(),
  ];
  const scoped = opts.gameSlug ? all.filter((r) => r.gameSlug === opts.gameSlug) : all;
  const game = opts.gameSlug ? (gameList.find((g) => g.slug === opts.gameSlug) ?? null) : null;
  if (scoped.length === 0) return { ...empty, games: gameList, game };

  // Most recent event in scope (rows are ordered by endsAt desc).
  const last = scoped[0]!;
  const rankFrom = (rows: typeof scoped) => {
    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r.recipientId, (totals.get(r.recipientId) ?? 0) + r.points);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i + 1] as const);
  };
  const now = new Map(rankFrom(scoped));
  const before = new Map(rankFrom(scoped.filter((r) => r.tournamentId !== last.tournamentId)));

  const teamIds = [...now.keys()];
  const teamRows = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      tag: teams.tag,
      city: teams.city,
      countryCode: teams.countryCode,
    })
    .from(teams)
    .where(inArray(teams.id, teamIds));
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  const rows: TeamRankingRow[] = teamIds.flatMap((id) => {
    const t = teamById.get(id);
    if (!t) return [];
    const mine = scoped.filter((r) => r.recipientId === id);
    const rank = now.get(id) ?? 0;
    const prev = before.get(id);
    return [
      {
        rank,
        delta: prev === undefined ? 0 : prev - rank,
        teamId: id,
        slug: t.slug,
        name: t.name,
        tag: t.tag,
        accentColor: getMockTeamBySlug(t.slug)?.accentColor ?? GOLD_FALLBACK,
        city: t.city,
        countryCode: t.countryCode,
        points: mine.reduce((s, r) => s + r.points, 0),
        medals: {
          gold: mine.filter((r) => r.placement === 1).length,
          silver: mine.filter((r) => r.placement === 2).length,
          bronze: mine.filter((r) => r.placement === 3).length,
        },
        tournaments: new Set(mine.map((r) => r.tournamentId)).size,
      },
    ];
  });
  rows.sort((a, b) => a.rank - b.rank);

  const tournamentIds = new Map(scoped.map((r) => [r.tournamentId, r.prizePoolKwd]));
  return {
    season: opts.season,
    organization: { slug: org.slug, name: org.name, tier: org.tier },
    game,
    games: gameList,
    rows,
    stats: {
      tournaments: tournamentIds.size,
      prizePoolKwd: [...tournamentIds.values()].reduce((s, v) => s + v, 0),
      teams: rows.length,
      medals: scoped.filter((r) => r.placement <= 3).length,
      pointsAwarded: scoped.reduce((s, r) => s + r.points, 0),
    },
    lastEvent: {
      slug: last.tournamentSlug,
      name: last.tournamentName,
      endsAt: last.endsAt ? last.endsAt.toISOString() : null,
    },
  };
}

/** The most recent season with any ranking points for this organization, or null. */
export async function latestRankingSeason(organizationSlug: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ season: rankingPoints.season })
    .from(rankingPoints)
    .innerJoin(organizations, eq(organizations.id, rankingPoints.awardedByOrganizationId))
    .where(eq(organizations.slug, organizationSlug))
    .orderBy(desc(rankingPoints.createdAt))
    .limit(1);
  return row?.season ?? null;
}
