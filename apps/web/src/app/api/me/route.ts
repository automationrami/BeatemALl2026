/**
 * GET /api/me — who am I? `{ viewer: { kind: 'account'|'demo', userId, displayName,
 * playerSlug, needsProfile?, isAdmin }, teams, organizations }`.
 */

import { NextResponse } from 'next/server';
import { listManagedOrganizations } from '@beat-em-all/db/queries';
import { getCurrentUser, getViewer } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'internal' }, { status: 500 });
  const needsProfile = viewer.kind === 'account' && viewer.needsProfile;
  const [me, organizations] = await Promise.all([
    needsProfile ? Promise.resolve(null) : getCurrentUser().catch(() => null),
    listManagedOrganizations(viewer.userId),
  ]);
  return NextResponse.json(
    { viewer, teams: me?.teamMemberships ?? [], organizations },
    { headers: { 'cache-control': 'no-store' } },
  );
}
