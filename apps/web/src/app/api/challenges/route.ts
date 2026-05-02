/**
 * /api/challenges
 *   GET  ?direction=incoming|outgoing|all  →  list challenges where the current persona's
 *        team(s) are challenger or challenged
 *   POST  body { challengedTeamSlug, gameSlug, format, dateRangeStart, dateRangeEnd, message?, proposedVenueSlug? }
 *        creates a challenge from the current persona's primary team to the named target.
 *
 * Authorisation in Phase 1 is the persona cookie (see `current_user.ts`). Auth.js v5 takes
 * over in E1-S2 — same routes, same response shapes; just swap the header source.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import {
  ChallengeError,
  createChallenge,
  intersectionGamesBetweenTeams,
  listChallengesForPlayer,
  type ChallengeDirection,
} from '@beat-em-all/db/queries';
import { getDb, teams, games } from '@beat-em-all/db';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const createSchema = z.object({
  challengedTeamSlug: z.string().min(1).max(80),
  gameSlug: z.string().min(1).max(40),
  format: z.enum(['bo1', 'bo3', 'bo5']),
  dateRangeStart: z.string().datetime(),
  dateRangeEnd: z.string().datetime(),
  message: z.string().max(500).optional().nullable(),
  proposedVenueSlug: z.string().max(80).optional().nullable(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const direction = (url.searchParams.get('direction') ?? 'all') as ChallengeDirection;
  if (!['incoming', 'outgoing', 'all'].includes(direction)) {
    return NextResponse.json({ error: 'invalid_direction' }, { status: 400 });
  }

  try {
    const me = await getCurrentUser();
    const challenges = await listChallengesForPlayer(me.playerId, direction);
    return NextResponse.json(
      { challenges, viewer: { playerId: me.playerId, slug: me.playerSlug } },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[GET /api/challenges] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching challenges.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const me = await getCurrentUser();
    if (me.teamMemberships.length === 0) {
      return NextResponse.json(
        {
          error: 'no_team',
          message: 'You must be on a team to send a challenge.',
        },
        { status: 403 },
      );
    }
    const myTeam = me.teamMemberships[0];
    if (!myTeam) {
      return NextResponse.json({ error: 'no_team' }, { status: 403 });
    }

    const db = getDb();
    const [challengedTeam] = await db
      .select({ id: teams.id, slug: teams.slug })
      .from(teams)
      .where(eq(teams.slug, parsed.data.challengedTeamSlug))
      .limit(1);
    if (!challengedTeam) {
      return NextResponse.json({ error: 'challenged_team_not_found' }, { status: 404 });
    }
    const [game] = await db
      .select({ id: games.id, slug: games.slug })
      .from(games)
      .where(eq(games.slug, parsed.data.gameSlug))
      .limit(1);
    if (!game) {
      return NextResponse.json({ error: 'game_not_found' }, { status: 404 });
    }

    // Validate that both teams play this game (intersection check).
    const sharedGames = await intersectionGamesBetweenTeams(myTeam.teamId, challengedTeam.id);
    if (!sharedGames.includes(parsed.data.gameSlug as (typeof sharedGames)[number])) {
      return NextResponse.json(
        {
          error: 'game_not_shared',
          message: `Both teams must play ${parsed.data.gameSlug} for this challenge.`,
        },
        { status: 400 },
      );
    }

    const challenge = await createChallenge({
      challengerTeamId: myTeam.teamId,
      challengedTeamId: challengedTeam.id,
      gameId: game.id,
      proposedFormat: parsed.data.format,
      proposedDateRangeStart: new Date(parsed.data.dateRangeStart),
      proposedDateRangeEnd: new Date(parsed.data.dateRangeEnd),
      proposedVenueSlug: parsed.data.proposedVenueSlug ?? null,
      message: parsed.data.message ?? null,
    });
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (err) {
    if (err instanceof ChallengeError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.code === 'forbidden' ? 403 : 400 },
      );
    }

    console.error('[POST /api/challenges] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong creating the challenge.' },
      { status: 500 },
    );
  }
}
