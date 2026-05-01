/**
 * GET /api/players/[slug] — public player profile.
 *
 * Returns the canonical `PlayerProfile` shape merged from DB (core identity, games)
 * + mock-data fallback (rich fields not yet modelled — pentagon, stats, etc.).
 *
 * Used by:
 *   - frontend client components via `getPlayerProfileForSlug(slug)` in @beat-em-all/api-client
 *   - Server Components (when they prefer HTTP over direct query import)
 *   - external uptime / smoke checks
 */

import { NextResponse } from 'next/server';
import { loadPlayerProfileBySlug } from '@beat-em-all/db/queries';

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
    const profile = await loadPlayerProfileBySlug(slug);
    if (!profile) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ profile }, { headers: { 'cache-control': 'no-store' } });
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
