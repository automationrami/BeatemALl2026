/**
 * GET /api/manage/venues/[slug]/bookings — the venue's bookings plus dashboard totals (V-04).
 * Only owners/admins of the venue's organisation; anyone else gets 404.
 */

import { NextResponse } from 'next/server';
import {
  listVenueBookingsForManager,
  loadManagedVenue,
  loadVenueDashboardStats,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { venueErrorResponse } from '@/lib/venue-http';

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
    const [stats, bookings] = await Promise.all([
      loadVenueDashboardStats(managed.venue.id),
      listVenueBookingsForManager(managed.venue.id),
    ]);
    return NextResponse.json({ stats, bookings }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return venueErrorResponse(err, 'GET /api/manage/venues/[slug]/bookings');
  }
}
