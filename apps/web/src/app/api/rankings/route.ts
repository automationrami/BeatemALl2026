/**
 * GET /api/rankings?org=kec&season=2026-spring&game=valorant
 *
 * Public team leaderboard per federation, per game, per season (FED-1 US-FED1.4).
 * `season` defaults to the organization's latest season with points; `game` is optional
 * (omitted = all games combined).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { latestRankingSeason, loadTeamRankings } from '@beat-em-all/db/queries';

const querySchema = z.object({
  org: z.string().min(1).max(80).default('kec'),
  season: z
    .string()
    .regex(/^\d{4}-(spring|summer|autumn|winter)$/)
    .optional(),
  game: z.string().min(1).max(40).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { org, game } = parsed.data;
  const season = parsed.data.season ?? (await latestRankingSeason(org));
  if (!season) {
    return NextResponse.json({ error: 'no_rankings', org }, { status: 404 });
  }
  const rankings = await loadTeamRankings({
    season,
    organizationSlug: org,
    gameSlug: game ?? null,
  });
  if (!rankings.organization) {
    return NextResponse.json({ error: 'org_not_found', org }, { status: 404 });
  }
  return NextResponse.json({ rankings });
}
