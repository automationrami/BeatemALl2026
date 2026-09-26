/**
 * POST /api/teams/[slug]/leave — the caller leaves the team (P-07).
 * The captain can't leave: transfer the captaincy first.
 * Errors: unauthorized 401 · not_a_member 403 · not_found 404 · sole_captain 409.
 */

import { NextResponse } from 'next/server';
import { leaveTeam } from '@beat-em-all/db/queries';
import { resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { slug } = await params;
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    await leaveTeam({
      teamSlug: slug,
      actor: { playerId: me.playerId, displayName: me.displayName },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return rosterErrorResponse(err, 'POST /api/teams/[slug]/leave');
  }
}
