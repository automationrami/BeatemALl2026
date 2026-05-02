/**
 * GET /api/registrations — current persona's tournament registrations.
 */

import { NextResponse } from 'next/server';
import { listRegistrationsForPlayer } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  let me;
  try {
    me = await getCurrentUser();
  } catch (err) {
    console.error('[GET /api/registrations] auth failed', err);
    return NextResponse.json(
      { error: 'unauthorized', message: 'Your session is stale. Refresh the page and try again.' },
      { status: 401 },
    );
  }
  try {
    const registrations = await listRegistrationsForPlayer(me.playerId, me.userId);
    return NextResponse.json(
      { registrations, viewer: { playerId: me.playerId, slug: me.playerSlug } },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[GET /api/registrations] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching registrations.' },
      { status: 500 },
    );
  }
}
