/**
 * /api/teams/[slug]
 *   GET   → public team profile: the canonical `Team` shape from the DB (identity, roster,
 *           games, `disbandedAt`) + mock-data overlay (stats, upcomingMatch).
 *   PATCH → body { bio?, city?, isRecruiting?, tag? } — captain or co-captain (T-05).
 *           Errors: invalid_body/invalid_tag 400 · unauthorized 401 · forbidden/leader_only 403 ·
 *           not_found 404 · team_disbanded 409.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadTeamBySlug, updateTeamDetails } from '@beat-em-all/db/queries';
import { invalidBody, readJson, resolveMe, rosterErrorResponse } from '@/lib/roster-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;

  if (!slug || slug.length > 80) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  try {
    const team = await loadTeamBySlug(slug);
    if (!team) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ team }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'internal',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

const patchSchema = z
  .object({
    bio: z.string().max(500).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    isRecruiting: z.boolean().optional(),
    tag: z.string().max(10).optional(),
  })
  .strict();

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params;
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody('Bio can be at most 500 characters and city 80.');
  const { me, response } = await resolveMe();
  if (response) return response;
  try {
    const team = await updateTeamDetails({
      teamSlug: slug,
      actor: { playerId: me.playerId, displayName: me.displayName },
      ...parsed.data,
    });
    return NextResponse.json({
      team: {
        slug: team.slug,
        tag: team.tag,
        bio: team.bio,
        city: team.city,
        isRecruiting: team.isRecruiting,
      },
    });
  } catch (err) {
    return rosterErrorResponse(err, 'PATCH /api/teams/[slug]');
  }
}
