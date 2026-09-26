/**
 * GET /api/home[?personaId=<id>] — composed Home Feed payload. Without a param the server
 * decides: the signed-in account's own feed, else the demo persona from the cookie.
 *
 * Phase 1: persona resolution via query param (the persona switcher posts the active
 * personaId). Phase 9 / E1-S2: replace with Auth.js session lookup; same payload shape.
 */

import { NextResponse } from 'next/server';
import { loadHomeFeed, loadHomeFeedForUser } from '@beat-em-all/db/queries';
import { getCurrentPersonaSlug } from '@/lib/current-user';
import { readSessionUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PERSONAS = new Set(['khaled', 'sara', 'ahmad', 'omar', 'fatima']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('personaId');
  if (requested !== null && !VALID_PERSONAS.has(requested)) {
    return NextResponse.json({ error: 'invalid_personaId' }, { status: 400 });
  }

  try {
    // A signed-in account gets its own feed; otherwise the demo persona (param or cookie).
    const userId = requested === null ? await readSessionUserId() : null;
    const accountFeed = userId ? await loadHomeFeedForUser(userId) : null;
    const personaId = requested ?? (await getCurrentPersonaSlug()).split('-')[0] ?? 'khaled';
    const data = accountFeed ?? (await loadHomeFeed(personaId));
    return NextResponse.json({ data }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
