/**
 * PATCH /api/me/invitations/[teamSlug] — body { action: 'accept' | 'decline' } (P-06).
 * Accept puts the caller on the roster as a starter; either way the team's leaders are told.
 * Errors: invalid_body 400 · unauthorized 401 · invite_not_found 404 · team_disbanded /
 * invite_expired 409.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { respondToInvitation } from '@beat-em-all/db/queries';
import { invalidBody, readJson, resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ teamSlug: string }> };

const bodySchema = z.object({ action: z.enum(['accept', 'decline']) });

export async function PATCH(request: Request, { params }: Params) {
  const { teamSlug } = await params;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody('action must be accept or decline.');
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const invitation = await respondToInvitation({
      teamSlug,
      actor: { playerId: me.playerId, displayName: me.displayName },
      action: parsed.data.action,
    });
    return NextResponse.json({ invitation });
  } catch (err) {
    return rosterErrorResponse(err, 'PATCH /api/me/invitations/[teamSlug]');
  }
}
