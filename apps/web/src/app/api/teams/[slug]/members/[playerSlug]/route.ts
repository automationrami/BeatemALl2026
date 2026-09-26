/**
 * PATCH /api/teams/[slug]/members/[playerSlug] — body { action } (T-03, T-04).
 *   promote            → co-captain (captain only)
 *   demote             → starter (captain only)
 *   remove             → off the roster (captain; co-captain for players below co-captain)
 *   transfer_captaincy → target becomes captain, caller becomes co-captain (captain only)
 * Errors: invalid_body/cannot_target_self 400 · unauthorized 401 · forbidden/leader_only/
 * captain_only 403 · not_found/member_not_found 404 · team_disbanded/invalid_state 409.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateTeamMember } from '@beat-em-all/db/queries';
import { invalidBody, readJson, resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string; playerSlug: string }> };

const bodySchema = z.object({
  action: z.enum(['promote', 'demote', 'remove', 'transfer_captaincy']),
});

export async function PATCH(request: Request, { params }: Params) {
  const { slug, playerSlug } = await params;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return invalidBody('action must be promote, demote, remove or transfer_captaincy.');
  }
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const member = await updateTeamMember({
      teamSlug: slug,
      actor: { playerId: me.playerId, displayName: me.displayName },
      playerSlug,
      action: parsed.data.action,
    });
    return NextResponse.json({ member });
  } catch (err) {
    return rosterErrorResponse(err, 'PATCH /api/teams/[slug]/members/[playerSlug]');
  }
}
