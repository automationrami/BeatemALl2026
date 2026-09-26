/**
 * POST /api/teams/[slug]/invites — body { playerSlug } (T-02).
 * Captain or co-captain invites a player by username; the player is notified.
 * Errors: invalid_body 400 · unauthorized 401 · forbidden/leader_only 403 · not_found /
 * player_not_found 404 · team_disbanded / already_member / already_invited /
 * not_open_to_invites 409.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { invitePlayer } from '@beat-em-all/db/queries';
import { invalidBody, readJson, resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.object({ playerSlug: z.string().trim().min(1).max(80) });

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody('Enter a player username.');
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const invite = await invitePlayer({
      teamSlug: slug,
      actor: { playerId: me.playerId, displayName: me.displayName },
      playerSlug: parsed.data.playerSlug,
    });
    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    return rosterErrorResponse(err, 'POST /api/teams/[slug]/invites');
  }
}
