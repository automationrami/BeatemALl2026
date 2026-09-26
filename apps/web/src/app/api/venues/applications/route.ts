/**
 * POST /api/venues/applications — a signed-in player applies to list their venue (V-01).
 *
 * Creates the venue-tier organisation (pending), the applicant's owner membership, the
 * venue (pending) and its games in one transaction, then notifies Beat'Em All staff.
 * Errors: 400 invalid_body | unknown_game | invalid_hours, 409 name_taken.
 */

import { NextResponse } from 'next/server';
import { submitVenueApplication } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { venueApplicationSchema } from '@/lib/venue-schemas';
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

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = venueApplicationSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error.flatten());

  try {
    const me = await getCurrentUser();
    const result = await submitVenueApplication({ ...parsed.data, byUserId: me.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return venueErrorResponse(err, 'POST /api/venues/applications');
  }
}
