/**
 * GET /api/home?personaId=<slug> — composed Home Feed payload.
 *
 * Phase 1: persona resolution via query param (the persona switcher posts the active
 * personaId). Phase 9 / E1-S2: replace with Auth.js session lookup; same payload shape.
 */

import { NextResponse } from 'next/server';
import { loadHomeFeed } from '@beat-em-all/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PERSONAS = new Set(['khaled', 'sara', 'ahmad', 'omar', 'fatima']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const personaId = url.searchParams.get('personaId') ?? 'khaled';
  if (!VALID_PERSONAS.has(personaId)) {
    return NextResponse.json({ error: 'invalid_personaId' }, { status: 400 });
  }

  try {
    const data = await loadHomeFeed(personaId);
    return NextResponse.json({ data }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
