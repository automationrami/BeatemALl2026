/**
 * GET   /api/registrations/[id]   — registration detail (auth-gated to registrant or teammate)
 * PATCH /api/registrations/[id]   — body { action: 'withdraw' }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  TournamentRegistrationError,
  loadRegistrationById,
  withdrawRegistration,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.discriminatedUnion('action', [z.object({ action: z.literal('withdraw') })]);

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  let me;
  try {
    me = await getCurrentUser();
  } catch (err) {
    console.error('[GET /api/registrations/[id]] auth failed', err);
    return NextResponse.json(
      { error: 'unauthorized', message: 'Your session is stale. Refresh the page and try again.' },
      { status: 401 },
    );
  }

  try {
    const data = await loadRegistrationById(id);
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const isRegistrant = data.registration.registeredByUserId === me.userId;
    const isTeammate = me.teamMemberships.some((m) => m.teamId === data.registration.teamId);
    if (!isRegistrant && !isTeammate) {
      // Mirror the page's notFound() stance — 404 (not 403) so we don't leak existence
      // of the registration to non-authorised users via the API surface.
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/registrations/[id]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong fetching the registration.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Unknown action.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let me;
  try {
    me = await getCurrentUser();
  } catch (err) {
    console.error('[PATCH /api/registrations/[id]] auth failed', err);
    return NextResponse.json(
      { error: 'unauthorized', message: 'Your session is stale. Refresh the page and try again.' },
      { status: 401 },
    );
  }

  try {
    const result = await withdrawRegistration({
      registrationId: id,
      byUserId: me.userId,
      byPlayerId: me.playerId,
    });
    return NextResponse.json({ registration: result });
  } catch (err) {
    if (err instanceof TournamentRegistrationError) {
      const STATUS_BY_CODE = {
        tournament_not_found: 404,
        team_not_found: 404,
        not_found: 404,
        forbidden: 403,
        registration_closed: 409,
        game_mismatch: 400,
        tournament_full: 409,
        already_registered: 409,
        invalid_state: 409,
        insert_failed: 500,
        update_failed: 500,
      } as const;
      const status = STATUS_BY_CODE[err.code] ?? 400;
      const message =
        err.code === 'update_failed'
          ? 'Could not update the registration. Please try again.'
          : err.message;
      if (err.code === 'update_failed') {
        console.error('[PATCH /api/registrations/[id]] update_failed', err);
      }
      return NextResponse.json({ error: err.code, message }, { status });
    }

    console.error('[PATCH /api/registrations/[id]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong updating the registration.' },
      { status: 500 },
    );
  }
}
