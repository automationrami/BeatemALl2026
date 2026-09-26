/**
 * GET   /api/bookings/[id] — booking detail.
 * PATCH /api/bookings/[id] — `{ action: 'cancel', reason? }`: the booking team's captain or
 *       co-captain cancels (T-08) while the booking is pending payment or confirmed and the
 *       venue's cancellation window hasn't started. Voucher payments are refunded and the
 *       venue is notified. Errors: 403 captain_only, 404 not_found, 409 invalid_state |
 *       cancel_window_passed.
 *
 * Auth: the booker, any member of the booking team, or a manager of the venue's organisation.
 * UUIDs are not unguessable enough to count as authorization on their own; this
 * endpoint mirrors the inbox's predicate so a booking can never leak across teams.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  cancelBookingByTeam,
  listManagedVenueIds,
  loadBookingById,
  loadBookingVoucherPayment,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  INVALID_JSON,
  invalidBodyResponse,
  invalidJsonResponse,
  readJson,
  venueErrorResponse,
} from '@/lib/venue-http';

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
    const isVenueManager =
      !isBooker && !isTeammate && (await listManagedVenueIds(me.userId)).includes(data.venue.id);
    if (!isBooker && !isTeammate && !isVenueManager) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const payment = await loadBookingVoucherPayment(id);
    return NextResponse.json({ ...data, payment }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/bookings/[id]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching the booking.' },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({
  action: z.literal('cancel'),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error.flatten());

  try {
    const me = await getCurrentUser();
    const booking = await cancelBookingByTeam({
      bookingId: id,
      byUserId: me.userId,
      byPlayerId: me.playerId,
      reason: parsed.data.reason ?? null,
    });
    return NextResponse.json({ booking });
  } catch (err) {
    return venueErrorResponse(err, 'PATCH /api/bookings/[id]');
  }
}
