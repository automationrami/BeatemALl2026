/**
 * GET /api/me/team — returns the current persona's primary team + the games it plays.
 * Used by the challenge modal to compute the games-intersection client-side.
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, teamGames, games } from '@beat-em-all/db';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const me = await getCurrentUser();
    const primary = me.teamMemberships[0];
    if (!primary) {
      return NextResponse.json({ team: null }, { headers: { 'cache-control': 'no-store' } });
    }
    const db = getDb();
    const gameRows = await db
      .select({ slug: games.slug })
      .from(teamGames)
      .innerJoin(games, eq(games.id, teamGames.gameId))
      .where(eq(teamGames.teamId, primary.teamId));
    return NextResponse.json(
      {
        team: {
          teamId: primary.teamId,
          teamSlug: primary.teamSlug,
          teamName: primary.teamName,
          games: gameRows.map((g) => g.slug),
        },
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
