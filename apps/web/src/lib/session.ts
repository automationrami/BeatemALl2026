import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Stateless signed session: `bx-session = base64url({ uid, exp }).hmac`. HttpOnly, 30 days.
 * `AUTH_SECRET` signs it (required in production). Signing out just deletes the cookie.
 */

export const SESSION_COOKIE = 'bx-session';
/** Set while a signed-in account has no player profile; the proxy sends them to onboarding. */
export const NEEDS_PROFILE_COOKIE = 'bx-needs-profile';
const MAX_AGE_S = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[session] AUTH_SECRET (32+ chars) must be set in production.');
  }
  return 'dev-only-insecure-secret-change-me-0123456789';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function encodeSession(userId: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: now + MAX_AGE_S * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      uid?: string;
      exp?: number;
    };
    if (!data.uid || !data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function startSession(userId: string, needsProfile: boolean): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(userId), { ...cookieBase, maxAge: MAX_AGE_S });
  if (needsProfile) jar.set(NEEDS_PROFILE_COOKIE, '1', { ...cookieBase, maxAge: MAX_AGE_S });
  else jar.delete(NEEDS_PROFILE_COOKIE);
}

export async function markProfileComplete(): Promise<void> {
  (await cookies()).delete(NEEDS_PROFILE_COOKIE);
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(NEEDS_PROFILE_COOKIE);
}
