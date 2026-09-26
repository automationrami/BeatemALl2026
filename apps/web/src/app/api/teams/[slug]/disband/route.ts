/**
 * POST /api/teams/[slug]/disband — captain only (T-05).
 * Marks the team disbanded, withdraws entries in tournaments that have not started (voucher
 * payments refunded), cancels pending/negotiating challenges, ends every membership and
 * notifies the members.
 * Errors: unauthorized 401 · forbidden/captain_only 403 · not_found 404 · team_disbanded 409.
 */

import { NextResponse } from 'next/server';
import { disbandTeam } from '@beat-em-all/db/queries';
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
    const result = await disbandTeam({
      teamSlug: slug,
      actor: { playerId: me.playerId, displayName: me.displayName },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return rosterErrorResponse(err, 'POST /api/teams/[slug]/disband');
  }
}
