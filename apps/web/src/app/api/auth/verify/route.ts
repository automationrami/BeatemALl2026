/**
 * POST /api/auth/verify  body { phone, code }
 *
 * Checks the code, creates the account on first sign-in and starts a session. The response
 * says whether the profile still needs completing (→ /onboarding).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, verifyPhoneOtp } from '@beat-em-all/db/queries';
import { startSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const bodySchema = z.object({ phone: z.string().min(8).max(20), code: z.string().min(4).max(8) });

const STATUS: Record<AuthError['code'], number> = {
  invalid_phone: 400,
  rate_limited: 429,
  no_code: 400,
  expired_code: 400,
  invalid_code: 400,
  too_many_attempts: 429,
  username_taken: 409,
  invalid_profile: 400,
  unknown_game: 400,
  not_found: 404,
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });

  try {
    const result = await verifyPhoneOtp(
      parsed.data.phone.replace(/\s+/g, ''),
      parsed.data.code.trim(),
    );
    await startSession(result.userId, !result.hasProfile);
    return NextResponse.json({
      signedIn: true,
      needsProfile: !result.hasProfile,
      isNew: result.isNew,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: STATUS[err.code] },
      );
    }
    console.error('[POST /api/auth/verify] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Could not sign you in.' },
      { status: 500 },
    );
  }
}
