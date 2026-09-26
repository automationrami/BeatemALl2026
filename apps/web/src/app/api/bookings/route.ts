/**
 * GET /api/bookings — list the active persona's bookings (theirs + their teams').
 */

import { NextResponse } from 'next/server';
import {
  listBookingsAtVenues,
  listBookingsForPlayer,
  listManagedVenueIds,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const me = await getCurrentUser();
    const [bookings, venueIds] = await Promise.all([
      listBookingsForPlayer(me.playerId, me.userId),
      listManagedVenueIds(me.userId),
    ]);
    // Venue owners and admins also see every booking made at their venues.
    const atMyVenues = await listBookingsAtVenues(venueIds);
    return NextResponse.json(
      { bookings, atMyVenues, viewer: { playerId: me.playerId, slug: me.playerSlug } },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[GET /api/bookings] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching bookings.' },
      { status: 500 },
    );
  }
}
