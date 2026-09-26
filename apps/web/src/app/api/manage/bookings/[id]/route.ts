/**
 * PATCH /api/manage/bookings/[id] — the venue acts on a booking (V-05 / V-06).
 * Body `{ action: 'check_in' | 'complete' | 'no_show' | 'cancel', reason? }` (reason required
 * to cancel). Only managers of the booking's venue; anyone else gets 404.
 * Errors: 400 invalid_body | reason_required, 404 not_found, 409 invalid_state.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actOnBookingAsVenue } from '@beat-em-all/db/queries';
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

const actionSchema = z.object({
  action: z.enum(['check_in', 'complete', 'no_show', 'cancel']),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error.flatten());

  try {
    const me = await getCurrentUser();
    const booking = await actOnBookingAsVenue({
      bookingId: id,
      byUserId: me.userId,
      action: parsed.data.action,
      reason: parsed.data.reason ?? null,
    });
    return NextResponse.json({ booking });
  } catch (err) {
    return venueErrorResponse(err, 'PATCH /api/manage/bookings/[id]');
  }
}
