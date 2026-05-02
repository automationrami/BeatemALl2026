/**
 * /api/challenges/[id]
 *   GET    →  full detail with negotiation history
 *   PATCH  body { action: 'accept' | 'reject' | 'counter', proposal? }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ChallengeError,
  acceptChallenge,
  counterChallenge,
  loadChallengeById,
  loadChallengeNegotiations,
  rejectChallenge,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

const proposalSchema = z.object({
  format: z.enum(['bo1', 'bo3', 'bo5']),
  dateRangeStart: z.string().datetime(),
  dateRangeEnd: z.string().datetime(),
  proposedVenueSlug: z.string().max(80).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('counter'), proposal: proposalSchema }),
]);

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  try {
    const data = await loadChallengeById(id);
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const negotiations = await loadChallengeNegotiations(id);
    const me = await getCurrentUser();
    return NextResponse.json(
      {
        ...data,
        negotiations,
        viewer: {
          playerId: me.playerId,
          slug: me.playerSlug,
          teamIds: me.teamMemberships.map((m) => m.teamId),
        },
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', message: err instanceof Error ? err.message : String(err) },
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
      { error: 'invalid_body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const me = await getCurrentUser();

    if (parsed.data.action === 'accept') {
      const result = await acceptChallenge({ challengeId: id, byPlayerId: me.playerId });
      return NextResponse.json(result);
    }
    if (parsed.data.action === 'reject') {
      const challenge = await rejectChallenge({ challengeId: id, byPlayerId: me.playerId });
      return NextResponse.json({ challenge });
    }
    // counter
    const proposal = parsed.data.proposal;
    const challenge = await counterChallenge({
      challengeId: id,
      byPlayerId: me.playerId,
      proposedFormat: proposal.format,
      proposedDateRangeStart: new Date(proposal.dateRangeStart),
      proposedDateRangeEnd: new Date(proposal.dateRangeEnd),
      proposedVenueSlug: proposal.proposedVenueSlug ?? null,
      message: proposal.message ?? null,
    });
    return NextResponse.json({ challenge });
  } catch (err) {
    if (err instanceof ChallengeError) {
      const status =
        err.code === 'not_found'
          ? 404
          : err.code === 'forbidden'
            ? 403
            : err.code === 'invalid_state' || err.code === 'invalid_date_range'
              ? 409
              : 400;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }

    console.error('[PATCH /api/challenges/[id]] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong updating the challenge.' },
      { status: 500 },
    );
  }
}
