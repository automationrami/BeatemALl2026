/**
 * POST /api/teams — create a team and immediately make the active persona its captain.
 *
 * The form-validation Zod schema is intentionally looser than the domain layer's regex
 * checks so the user gets a single friendly error per field at the domain layer rather
 * than a generic Zod issue list. (Length + presence checks live here; format checks live
 * inside `createTeam` so the error messages can be localised by code.)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TeamError, createTeam } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const createSchema = z.object({
  name: z.string().min(1).max(80),
  tag: z.string().min(1).max(10),
  slug: z.string().min(1).max(60),
  countryCode: z.string().min(2).max(3),
  city: z.string().max(80).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  isRecruiting: z.boolean().optional(),
  gameSlugs: z.array(z.string().min(1).max(40)).min(1).max(6),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    // Surface a top-level `message` so the client's generic `body.message ?? body.error`
    // rendering shows something actionable instead of the literal "invalid_body".
    const flat = parsed.error.flatten();
    const firstField = Object.entries(flat.fieldErrors).find(([, msgs]) => msgs && msgs.length);
    const message = firstField
      ? `${firstField[0]}: ${(firstField[1] as string[])[0]}`
      : 'Some fields are invalid.';
    return NextResponse.json(
      { error: 'invalid_body', message, issues: flat },
      { status: 400 },
    );
  }

  let me;
  try {
    me = await getCurrentUser();
  } catch (err) {
    // The cookie pointed to a persona slug whose player row no longer exists. That's
    // an auth-state problem (likely seeds drifted), not a server fault. 401 + a hint
    // to refresh is the right UX. Same gap exists in booking/challenge routes today —
    // documented as a follow-up in BACKLOG.md.
    console.error('[POST /api/teams] auth resolution failed', err);
    return NextResponse.json(
      { error: 'unauthorized', message: 'Your session is stale. Refresh the page and try again.' },
      { status: 401 },
    );
  }

  try {
    const team = await createTeam({
      byPlayerId: me.playerId,
      name: parsed.data.name,
      tag: parsed.data.tag,
      slug: parsed.data.slug,
      countryCode: parsed.data.countryCode,
      city: parsed.data.city ?? null,
      bio: parsed.data.bio ?? null,
      isRecruiting: parsed.data.isRecruiting ?? false,
      gameSlugs: parsed.data.gameSlugs,
    });
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    if (err instanceof TeamError) {
      const STATUS_BY_CODE = {
        invalid_name: 400,
        invalid_tag: 400,
        invalid_slug: 400,
        invalid_country: 400,
        no_games: 400,
        unknown_game: 400,
        slug_taken: 409,
        forbidden: 403,
        insert_failed: 500,
      } as const;
      const status = STATUS_BY_CODE[err.code] ?? 400;
      const message =
        err.code === 'insert_failed' ? 'Could not create the team. Please try again.' : err.message;
      if (err.code === 'insert_failed') {
        console.error('[POST /api/teams] insert_failed', err);
      }
      return NextResponse.json({ error: err.code, message }, { status });
    }

    console.error('[POST /api/teams] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong creating the team.' },
      { status: 500 },
    );
  }
}
