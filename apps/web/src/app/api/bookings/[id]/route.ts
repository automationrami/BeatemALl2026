/**
 * GET /api/bookings/[id] — booking detail.
 *
 * Auth: only the booker (by user id) or any member of the booking team can read.
 * UUIDs are not unguessable enough to count as authorization on their own; this
 * endpoint mirrors the inbox's predicate so a booking can never leak across teams.
 */

import { NextResponse } from 'next/server';
import { loadBookingById } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  try {
    const data = await loadBookingById(id);
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const me = await getCurrentUser();
    const isBooker = data.booking.bookedByUserId === me.userId;
    const isTeammate = me.teamMemberships.some((m) => m.teamId === data.booking.bookedByTeamId);
    if (!isBooker && !isTeammate) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/bookings/[id]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching the booking.' },
      { status: 500 },
    );
  }
}
