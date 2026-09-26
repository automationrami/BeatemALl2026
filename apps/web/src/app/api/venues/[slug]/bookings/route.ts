/**
 * POST /api/venues/[slug]/bookings — create a booking from the active persona's
 * primary team to the named venue.
 *
 * Auth in Phase 1 = persona cookie. Switches to Auth.js v5 in E1-S2 with no API change.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BookingError,
  VoucherError,
  createBooking,
  listVenueSupportedGames,
} from '@beat-em-all/db/queries';
import { voucherErrorResponse } from '@/lib/voucher-http';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

const createSchema = z.object({
  gameSlug: z.string().min(1).max(40),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  seatsCount: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional().nullable(),
  /** Pay in full with a voucher; the booking is confirmed straight away. */
  voucherCode: z.string().min(4).max(40).optional().nullable(),
});

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  try {
    const supportedGames = await listVenueSupportedGames(slug);
    return NextResponse.json({ supportedGames }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/venues/[slug]/bookings] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const me = await getCurrentUser();
    const myTeam = me.teamMemberships[0];
    if (!myTeam) {
      return NextResponse.json(
        { error: 'no_team', message: 'You must be on a team to book a venue.' },
        { status: 403 },
      );
    }

    const result = await createBooking({
      venueSlug: slug,
      byUserId: me.userId,
      byPlayerId: me.playerId,
      byTeamId: myTeam.teamId,
      gameSlug: parsed.data.gameSlug,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      seatsCount: parsed.data.seatsCount,
      notes: parsed.data.notes ?? null,
      voucherCode: parsed.data.voucherCode || null,
    });
    return NextResponse.json({ booking: result }, { status: 201 });
  } catch (err) {
    if (err instanceof VoucherError) return voucherErrorResponse(err);
    if (err instanceof BookingError) {
      const STATUS_BY_CODE = {
        venue_not_found: 404,
        venue_unavailable: 400,
        game_not_found: 404,
        game_not_supported: 400,
        forbidden: 403,
        captain_only: 403,
        invalid_seats: 400,
        invalid_date_range: 400,
        over_capacity: 409,
        slot_unavailable: 409,
        outside_opening_hours: 400,
        insert_failed: 500,
      } as const;
      const status = STATUS_BY_CODE[err.code] ?? 400;
      // Don't leak DB-layer details from server-side faults — log them and send a
      // generic message. Client-fault codes return their own message which is curated.
      const message =
        err.code === 'insert_failed'
          ? 'Could not create the booking. Please try again.'
          : err.message;
      if (err.code === 'insert_failed') {
        console.error('[POST /api/venues/[slug]/bookings] insert_failed', err);
      }
      return NextResponse.json({ error: err.code, message }, { status });
    }

    console.error('[POST /api/venues/[slug]/bookings] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong creating the booking.' },
      { status: 500 },
    );
  }
}
