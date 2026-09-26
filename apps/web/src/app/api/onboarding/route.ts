/**
 * POST /api/onboarding — finish sign-up (E1 US-1.2).
 * body { displayName, username, countryCode, city, gameSlugs[], locale? }
 * GET  /api/onboarding?username=… — is the username free?
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, completeProfile, isUsernameAvailable } from '@beat-em-all/db/queries';
import { markProfileComplete, readSessionUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const bodySchema = z.object({
  displayName: z.string().min(2).max(60),
  username: z.string().min(3).max(30),
  countryCode: z.string().min(2).max(3),
  city: z.string().min(2).max(60),
  gameSlugs: z.array(z.string().min(1).max(40)).min(1).max(10),
  locale: z.enum(['en', 'ar']).optional(),
});

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get('username') ?? '';
  if (!/^[a-z0-9-]{3,30}$/.test(username)) return NextResponse.json({ available: false });
  return NextResponse.json({ available: await isUsernameAvailable(username) });
}

export async function POST(request: Request) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized', message: 'Sign in first.' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_profile', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const result = await completeProfile({ userId, ...parsed.data });
    await markProfileComplete();
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.code === 'username_taken' ? 409 : 400 },
      );
    }
    console.error('[POST /api/onboarding] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Could not save your profile.' },
      { status: 500 },
    );
  }
}
