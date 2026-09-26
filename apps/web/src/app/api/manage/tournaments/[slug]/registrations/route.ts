/**
 * GET /api/manage/tournaments/[slug]/registrations — every entry (any status) with payment,
 * seed, check-in and disqualification details (M-04). Organisers only.
 * Errors: 403 forbidden, 404 not_found.
 */

import { NextResponse } from 'next/server';
import { listTournamentEntries } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { tournamentAdminErrorResponse } from '@/lib/tournament-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  try {
    const me = await getCurrentUser();
    const registrations = await listTournamentEntries(slug, me.userId);
    return NextResponse.json({ registrations }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'GET /api/manage/tournaments/[slug]/registrations');
  }
}
