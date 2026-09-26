/**
 * Who is using the app.
 *
 * 1. A signed-in account (phone OTP session cookie) always wins.
 * 2. Otherwise the demo persona cookie (`bx-current-persona`) picks one of the five seeded
 *    personas, so the pilot can be explored without an account. Defaults to Khaled.
 */

import 'server-only';
import { cookies } from 'next/headers';
import {
  PERSONA_COOKIE_NAME,
  coercePersonaSlug,
  isPlatformAdmin,
  loadAccount,
  loadCurrentUserById,
  loadUserByPersonaSlug,
  type CurrentUser,
  type PersonaSlug,
} from '@beat-em-all/db/queries';
import { readSessionUserId } from './session';

/** A signed-in account that hasn't finished its profile yet (no player row). */
export class ProfileIncompleteError extends Error {
  code = 'profile_incomplete' as const;
  constructor() {
    super('Finish your profile first.');
    this.name = 'ProfileIncompleteError';
  }
}

export async function getCurrentPersonaSlug(): Promise<PersonaSlug> {
  const jar = await cookies();
  return coercePersonaSlug(jar.get(PERSONA_COOKIE_NAME)?.value);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const userId = await readSessionUserId();
  if (userId) {
    const user = await loadCurrentUserById(userId);
    if (!user) throw new ProfileIncompleteError();
    return user;
  }
  return loadUserByPersonaSlug(await getCurrentPersonaSlug());
}

export type Viewer =
  | {
      kind: 'account';
      userId: string;
      displayName: string;
      playerSlug: string | null;
      needsProfile: boolean;
      isAdmin: boolean;
    }
  | { kind: 'demo'; userId: string; displayName: string; playerSlug: string; isAdmin: boolean };

/** Lightweight identity for the app shell (never throws for incomplete profiles). */
export async function getViewer(): Promise<Viewer | null> {
  try {
    const userId = await readSessionUserId();
    if (userId) {
      const account = await loadAccount(userId);
      if (account) {
        return {
          kind: 'account',
          userId,
          displayName: account.displayName,
          playerSlug: account.player?.slug ?? null,
          needsProfile: !account.player,
          isAdmin: await isPlatformAdmin(userId),
        };
      }
    }
    const demo = await loadUserByPersonaSlug(await getCurrentPersonaSlug());
    return {
      kind: 'demo',
      userId: demo.userId,
      displayName: demo.displayName,
      playerSlug: demo.playerSlug,
      isAdmin: await isPlatformAdmin(demo.userId),
    };
  } catch (err) {
    // Let Next's own control-flow signals (dynamic rendering, redirects) through.
    if (typeof err === 'object' && err && 'digest' in err) throw err;
    console.error('[getViewer] failed', err);
    return null;
  }
}
