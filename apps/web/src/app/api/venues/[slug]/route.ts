import { NextResponse } from 'next/server';
import { loadVenueBySlug } from '@beat-em-all/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });

  try {
    const venue = await loadVenueBySlug(slug);
    if (!venue) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ venue }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { error: 'internal', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
