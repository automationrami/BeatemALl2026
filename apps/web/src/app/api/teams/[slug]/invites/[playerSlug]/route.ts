/**
 * DELETE /api/teams/[slug]/invites/[playerSlug] — cancel a pending invitation (T-02).
 * Errors: unauthorized 401 · forbidden/leader_only 403 · not_found/invite_not_found 404.
 */

import { NextResponse } from 'next/server';
import { cancelInvite } from '@beat-em-all/db/queries';
import { resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string; playerSlug: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { slug, playerSlug } = await params;
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    await cancelInvite({
      teamSlug: slug,
      actor: { playerId: me.playerId, displayName: me.displayName },
      playerSlug,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return rosterErrorResponse(err, 'DELETE /api/teams/[slug]/invites/[playerSlug]');
  }
}
