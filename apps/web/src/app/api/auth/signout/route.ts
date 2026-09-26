/** POST /api/auth/signout — ends the session (the demo persona takes over again). */

import { NextResponse } from 'next/server';
import { endSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await endSession();
  return NextResponse.json({ signedIn: false });
}
