/**
 * GET /api/me/invitations — the caller's open team invitations (P-06). Invitations older
 * than 7 days and invitations from disbanded teams are left out.
 */

import { NextResponse } from 'next/server';
import { listMyInvitations } from '@beat-em-all/db/queries';
import { NO_STORE, resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const invitations = await listMyInvitations(me.playerId);
    return NextResponse.json({ invitations }, { headers: NO_STORE });
  } catch (err) {
    return rosterErrorResponse(err, 'GET /api/me/invitations');
  }
}
