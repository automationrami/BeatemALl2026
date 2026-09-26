/**
 * POST /api/auth/otp  body { phone }  (E.164, GCC)
 *
 * Creates a 6-digit sign-in code. With an SMS provider configured the code is texted; in
 * pilot mode (no provider) it is returned as `demoCode` so the screen can show it.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, startPhoneOtp } from '@beat-em-all/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const bodySchema = z.object({ phone: z.string().min(8).max(20) });

/** True once an SMS provider is wired (E1-S2 / P-1). Until then codes are shown on screen. */
function smsConfigured(): boolean {
  return !!process.env.UNIFONIC_APP_SID;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });

  try {
    const { code, expiresAt } = await startPhoneOtp(parsed.data.phone.replace(/\s+/g, ''));
    const pilot = !smsConfigured();
    // Real SMS delivery goes through @beat-em-all/api-client once Unifonic is configured.
    return NextResponse.json({ sent: true, expiresAt, pilot, demoCode: pilot ? code : undefined });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.code === 'rate_limited' ? 429 : 400 },
      );
    }
    console.error('[POST /api/auth/otp] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Could not send a code.' },
      { status: 500 },
    );
  }
}
