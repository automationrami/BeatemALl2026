/**
 * /api/notifications
 *   GET   → `{ notifications, unread }` for the current viewer (newest first).
 *   PATCH body { ids?: string[] } → mark those (or all) read.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
} from '@beat-em-all/db/queries';
import { getViewer } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const countOnly = new URL(request.url).searchParams.get('count') === '1';
  const unread = await countUnreadNotifications(viewer.userId);
  if (countOnly) return NextResponse.json({ unread }, { headers: { 'cache-control': 'no-store' } });
  const notifications = await listNotifications(viewer.userId);
  return NextResponse.json({ notifications, unread }, { headers: { 'cache-control': 'no-store' } });
}

const patchSchema = z.object({ ids: z.array(z.string().uuid()).max(200).optional() });

export async function PATCH(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body = mark everything read.
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  await markNotificationsRead(viewer.userId, parsed.data.ids);
  return NextResponse.json({ unread: await countUnreadNotifications(viewer.userId) });
}
