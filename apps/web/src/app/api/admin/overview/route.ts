/**
 * GET /api/admin/overview — platform counts (A-02) and the review queue (A-01).
 * Beat'Em All staff only (owners/admins of the platform organisation); others get 403.
 */

import { NextResponse } from 'next/server';
import { isPlatformAdmin, loadPlatformOverview } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { venueErrorResponse } from '@/lib/venue-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!(await isPlatformAdmin(me.userId))) {
      return NextResponse.json(
        { error: 'forbidden', message: "Only Beat'Em All staff can see this." },
        { status: 403 },
      );
    }
    const overview = await loadPlatformOverview();
    return NextResponse.json(overview, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return venueErrorResponse(err, 'GET /api/admin/overview');
  }
}
