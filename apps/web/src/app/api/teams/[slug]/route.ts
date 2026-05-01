/**
 * GET /api/teams/[slug] — public team profile.
 * Returns the canonical `Team` shape merged from DB (identity, members, games)
 * + mock-data overlay (stats, upcomingMatch, mock-only roster members).
 */

import { NextResponse } from 'next/server';
import { loadTeamBySlug } from '@beat-em-all/db/queries';

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
