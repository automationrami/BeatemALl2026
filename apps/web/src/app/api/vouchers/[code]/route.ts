/**
 * /api/vouchers/[code]
 *   GET    → would this code pay for something? Read-only. One of:
 *              ?bookingId=<uuid>        a pending booking (amount + venue + team from it)
 *              ?registrationId=<uuid>   a pending tournament entry
 *              ?venue=<slug>&amount=<kwd>  a booking not made yet (viewer's primary team)
 *            Issuers (owner/admin of the issuing organisation) also get the full voucher.
 *   PATCH  body { action: 'revoke' } → issuer only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import {
  VoucherError,
  loadBookingById,
  loadIssuedVoucher,
  loadRegistrationById,
  previewVoucher,
  revokeVoucher,
} from '@beat-em-all/db/queries';
import { getDb, venues } from '@beat-em-all/db';
import { getCurrentUser } from '@/lib/current-user';
import { voucherErrorResponse } from '@/lib/voucher-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ code: string }> };

const querySchema = z.object({
  bookingId: z.string().uuid().optional(),
  registrationId: z.string().uuid().optional(),
  venue: z.string().min(1).max(80).optional(),
  amount: z.coerce.number().positive().max(100_000).optional(),
});

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const url = new URL(request.url);
  const q = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 });

  try {
    const me = await getCurrentUser();
    const issued = await loadIssuedVoucher(decodeURIComponent(code), me.userId);

    let target: {
      teamId: string;
      amountKwd: number;
      venueId: string | null;
      purpose: 'booking' | 'tournament_entry';
    } | null = null;
    if (q.data.bookingId) {
      const b = await loadBookingById(q.data.bookingId);
      const mine = b && me.teamMemberships.some((m) => m.teamId === b.booking.bookedByTeamId);
      if (!b || !mine) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      target = {
        teamId: b.booking.bookedByTeamId,
        amountKwd: b.booking.totalAmountKwd,
        venueId: b.venue.id,
        purpose: 'booking',
      };
    } else if (q.data.registrationId) {
      const r = await loadRegistrationById(q.data.registrationId);
      const mine = r && me.teamMemberships.some((m) => m.teamId === r.registration.teamId);
      if (!r || !mine) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      target = {
        teamId: r.team.id,
        amountKwd: r.tournament.entryFeeKwd,
        venueId: null,
        purpose: 'tournament_entry',
      };
    } else if (q.data.venue && q.data.amount) {
      const team = me.teamMemberships[0];
      if (!team) return NextResponse.json({ error: 'no_team' }, { status: 403 });
      const [v] = await getDb()
        .select({ id: venues.id })
        .from(venues)
        .where(eq(venues.slug, q.data.venue))
        .limit(1);
      if (!v) return NextResponse.json({ error: 'venue_not_found' }, { status: 404 });
      target = { teamId: team.teamId, amountKwd: q.data.amount, venueId: v.id, purpose: 'booking' };
    }

    if (!target && !issued) {
      return NextResponse.json(
        { error: 'invalid_query', message: 'Pass bookingId, registrationId, or venue and amount.' },
        { status: 400 },
      );
    }
    const preview = target
      ? await previewVoucher({ code: decodeURIComponent(code), ...target })
      : null;
    return NextResponse.json(
      { preview, voucher: issued },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[GET /api/vouchers/[code]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong checking the voucher.' },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({ action: z.literal('revoke') });

export async function PATCH(request: Request, { params }: Params) {
  const { code } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!patchSchema.safeParse(body).success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  try {
    const me = await getCurrentUser();
    const voucher = await revokeVoucher({ code: decodeURIComponent(code), byUserId: me.userId });
    return NextResponse.json({ voucher });
  } catch (err) {
    if (err instanceof VoucherError) return voucherErrorResponse(err);
    console.error('[PATCH /api/vouchers/[code]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong revoking the voucher.' },
      { status: 500 },
    );
  }
}
