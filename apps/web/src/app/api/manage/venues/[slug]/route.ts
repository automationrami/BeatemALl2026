/**
 * GET   /api/manage/venues/[slug] — the venue in any review state, for its managers.
 * PATCH /api/manage/venues/[slug] — edit details, price, games + seats (replaces the set),
 *       opening hours, cancellation window and the "accepting bookings" switch (V-03).
 *
 * Only owners/admins of the venue's organisation; anyone else gets 404.
 * Errors: 400 invalid_body | unknown_game | invalid_hours, 404 not_found.
 */

import { NextResponse } from 'next/server';
import { loadManagedVenue, updateManagedVenue } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { venueUpdateSchema } from '@/lib/venue-schemas';
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

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  try {
    const me = await getCurrentUser();
    const managed = await loadManagedVenue(slug, me.userId);
    if (!managed) {
      return NextResponse.json(
        { error: 'not_found', message: 'Venue not found.' },
        { status: 404 },
      );
    }
    return NextResponse.json(managed, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return venueErrorResponse(err, 'GET /api/manage/venues/[slug]');
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = venueUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error.flatten());

  try {
    const me = await getCurrentUser();
    const venue = await updateManagedVenue(slug, me.userId, parsed.data);
    return NextResponse.json({ venue });
  } catch (err) {
    return venueErrorResponse(err, 'PATCH /api/manage/venues/[slug]');
  }
}
