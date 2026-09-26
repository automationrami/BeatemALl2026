/**
 * /api/me/profile (P-04)
 *   GET   → the caller's editable profile
 *   PATCH → body { displayName (2–60), bio? (≤280), city?, countryCode, isOpenToTeamInvites,
 *           gameSlugs (≥1) }. The games list replaces the player's games.
 * Errors: invalid_body/invalid_name/bio_too_long/invalid_city/invalid_country/no_games/
 * unknown_game 400 · unauthorized 401 · profile_incomplete 403 · not_found 404.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadEditableProfile, updatePlayerProfile } from '@beat-em-all/db/queries';
import { NO_STORE, invalidBody, readJson, resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Length rules live in `updatePlayerProfile` so each failure gets its own error code.
const bodySchema = z.object({
  displayName: z.string().max(200),
  bio: z.string().max(2000).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  countryCode: z.string().max(3),
  isOpenToTeamInvites: z.boolean(),
  gameSlugs: z.array(z.string().max(40)).max(20),
});

export async function GET() {
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const profile = await loadEditableProfile(me.playerId);
    if (!profile) {
      return NextResponse.json(
        { error: 'not_found', message: 'Profile not found.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ profile }, { headers: NO_STORE });
  } catch (err) {
    return rosterErrorResponse(err, 'GET /api/me/profile');
  }
}

export async function PATCH(request: Request) {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody();
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const profile = await updatePlayerProfile({
      userId: me.userId,
      playerId: me.playerId,
      ...parsed.data,
    });
    return NextResponse.json({ profile });
  } catch (err) {
    return rosterErrorResponse(err, 'PATCH /api/me/profile');
  }
}
