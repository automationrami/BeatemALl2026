/**
 * GET  /api/tournaments/[slug]/registrations  — list registered teams for the tournament
 * POST /api/tournaments/[slug]/registrations  — register the active persona's primary team
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  TournamentRegistrationError,
  listRegistrationsForTournament,
  registerTeamForTournament,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

const registerSchema = z.object({
  /** Optional explicit team id; defaults to the persona's primary team. */
  teamId: z.string().uuid().optional(),
});

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  try {
    const registrations = await listRegistrationsForTournament(slug);
    return NextResponse.json({ registrations }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/tournaments/[slug]/registrations] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching registrations.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });

  // POST body is OPTIONAL (empty body → register the persona's primary team). But if a
  // client sends invalid JSON we shouldn't silently coerce to {} — that would default
  // them to the primary team rather than rejecting the malformed request.
  const raw = await request.text();
  let body: unknown = {};
  if (raw.trim().length > 0) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'invalid_json', message: 'Request body is not valid JSON.' },
        { status: 400 },
      );
    }
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.entries(flat.fieldErrors).find(([, msgs]) => msgs && msgs.length);
    const message = firstField
      ? `${firstField[0]}: ${(firstField[1] as string[])[0]}`
      : 'Some fields are invalid.';
    return NextResponse.json({ error: 'invalid_body', message, issues: flat }, { status: 400 });
  }

  let me;
  try {
    me = await getCurrentUser();
  } catch (err) {
    console.error('[POST /api/tournaments/[slug]/registrations] auth failed', err);
    return NextResponse.json(
      { error: 'unauthorized', message: 'Your session is stale. Refresh the page and try again.' },
      { status: 401 },
    );
  }

  // Resolve team: explicit body.teamId must be one the persona is on; default to primary.
  const explicitTeamId = parsed.data.teamId;
  let teamId: string | undefined = explicitTeamId;
  if (explicitTeamId) {
    const onTeam = me.teamMemberships.some((m) => m.teamId === explicitTeamId);
    if (!onTeam) {
      return NextResponse.json(
        { error: 'forbidden', message: "You're not a member of that team." },
        { status: 403 },
      );
    }
  } else {
    teamId = me.teamMemberships[0]?.teamId;
  }
  if (!teamId) {
    return NextResponse.json(
      { error: 'no_team', message: 'You must be on a team to register.' },
      { status: 403 },
    );
  }

  try {
    const result = await registerTeamForTournament({
      tournamentSlug: slug,
      byUserId: me.userId,
      byPlayerId: me.playerId,
      byTeamId: teamId,
    });
    return NextResponse.json({ registration: result }, { status: 201 });
  } catch (err) {
    if (err instanceof TournamentRegistrationError) {
      const STATUS_BY_CODE = {
        tournament_not_found: 404,
        team_not_found: 404,
        not_found: 404,
        forbidden: 403,
        captain_only: 403,
        roster_too_small: 400,
        registration_closed: 409,
        game_mismatch: 400,
        tournament_full: 409,
        already_registered: 409,
        invalid_state: 409,
        insert_failed: 500,
        update_failed: 500,
      } as const;
      const status = STATUS_BY_CODE[err.code] ?? 400;
      const message =
        err.code === 'insert_failed' || err.code === 'update_failed'
          ? 'Could not register. Please try again.'
          : err.message;
      if (err.code === 'insert_failed' || err.code === 'update_failed') {
        console.error('[POST /api/tournaments/[slug]/registrations]', err.code, err);
      }
      return NextResponse.json({ error: err.code, message }, { status });
    }

    console.error('[POST /api/tournaments/[slug]/registrations] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong creating the registration.' },
      { status: 500 },
    );
  }
}
