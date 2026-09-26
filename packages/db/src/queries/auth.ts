/**
 * Phone sign-in (E1 US-1.1 / 1.2): one-time codes, account lookup, profile completion.
 *
 * Codes are 6 digits, stored as a SHA-256 hash, valid for 10 minutes, 5 tries each; a phone
 * can request 5 codes per 15 minutes. Delivery is the caller's job (SMS provider, or shown
 * on screen in pilot mode when no provider is configured).
 */

import { createHash, randomInt } from 'node:crypto';
import { and, asc, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../client';
import { authOtps } from '../schema/auth';
import { users } from '../schema/users';
import { players } from '../schema/players';
import { playerGames } from '../schema/player_games';
import { games } from '../schema/games';
import { teamMembers } from '../schema/team_members';
import { teams } from '../schema/teams';
import { activeMembership } from './roles';
import type { CurrentUser } from './current_user';

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60_000;

export class AuthError extends Error {
  constructor(
    public code:
      | 'invalid_phone'
      | 'rate_limited'
      | 'no_code'
      | 'expired_code'
      | 'invalid_code'
      | 'too_many_attempts'
      | 'username_taken'
      | 'invalid_profile'
      | 'unknown_game'
      | 'not_found',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const E164 = /^\+9(65|66|71|73|74|68)\d{7,9}$/;

function hashCode(phone: string, code: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

/** Create a sign-in code for a GCC phone number (E.164). Returns the plain code for delivery. */
export async function startPhoneOtp(phone: string): Promise<{ code: string; expiresAt: Date }> {
  if (!E164.test(phone)) throw new AuthError('invalid_phone', 'Enter a GCC mobile number.');
  const db = getDb();
  const [recent] = await db
    .select({ n: count() })
    .from(authOtps)
    .where(
      and(
        eq(authOtps.phoneNumber, phone),
        gte(authOtps.createdAt, new Date(Date.now() - WINDOW_MS)),
      ),
    );
  if ((recent?.n ?? 0) >= MAX_CODES_PER_WINDOW) {
    throw new AuthError('rate_limited', 'Too many codes requested. Try again in 15 minutes.');
  }
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await db
    .insert(authOtps)
    .values({ phoneNumber: phone, codeHash: hashCode(phone, code), expiresAt });
  return { code, expiresAt };
}

/** Check a code; on success returns the user (created on first sign-in) and whether a profile exists. */
export async function verifyPhoneOtp(
  phone: string,
  code: string,
): Promise<{ userId: string; hasProfile: boolean; isNew: boolean }> {
  if (!E164.test(phone)) throw new AuthError('invalid_phone', 'Enter a GCC mobile number.');
  const db = getDb();
  const [otp] = await db
    .select()
    .from(authOtps)
    .where(and(eq(authOtps.phoneNumber, phone), isNull(authOtps.consumedAt)))
    .orderBy(desc(authOtps.createdAt))
    .limit(1);
  if (!otp) throw new AuthError('no_code', 'Request a code first.');
  if (otp.expiresAt.getTime() < Date.now())
    throw new AuthError('expired_code', 'That code expired. Request a new one.');
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new AuthError('too_many_attempts', 'Too many wrong codes. Request a new one.');
  }
  if (!/^\d{6}$/.test(code) || otp.codeHash !== hashCode(phone, code)) {
    await db
      .update(authOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(authOtps.id, otp.id));
    throw new AuthError('invalid_code', "That code doesn't match.");
  }
  await db.update(authOtps).set({ consumedAt: new Date() }).where(eq(authOtps.id, otp.id));

  let [user] = await db.select().from(users).where(eq(users.phoneNumber, phone)).limit(1);
  let isNew = false;
  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ phoneNumber: phone, displayName: phone, phoneVerifiedAt: new Date() })
      .onConflictDoNothing({ target: users.phoneNumber })
      .returning();
    user =
      inserted[0] ??
      (await db.select().from(users).where(eq(users.phoneNumber, phone)).limit(1))[0];
    isNew = true;
  } else if (!user.phoneVerifiedAt) {
    await db.update(users).set({ phoneVerifiedAt: new Date() }).where(eq(users.id, user.id));
  }
  if (!user) throw new AuthError('not_found', 'Could not create the account.');
  const [player] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.userId, user.id))
    .limit(1);
  return { userId: user.id, hasProfile: !!player, isNew };
}

export type Account = {
  userId: string;
  phoneNumber: string;
  displayName: string;
  locale: 'en' | 'ar';
  player: { id: string; slug: string } | null;
};

export async function loadAccount(userId: string): Promise<Account | null> {
  const db = getDb();
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.deletedAt) return null;
  const [p] = await db
    .select({ id: players.id, slug: players.slug })
    .from(players)
    .where(eq(players.userId, u.id))
    .limit(1);
  return {
    userId: u.id,
    phoneNumber: u.phoneNumber,
    displayName: u.displayName,
    locale: u.locale,
    player: p ?? null,
  };
}

/** The signed-in user as a `CurrentUser`, or null when they haven't completed a profile. */
export async function loadCurrentUserById(userId: string): Promise<CurrentUser | null> {
  const account = await loadAccount(userId);
  if (!account?.player) return null;
  const memberships = await getDb()
    .select({
      teamId: teams.id,
      teamSlug: teams.slug,
      teamName: teams.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(
      and(
        eq(teamMembers.playerId, account.player.id),
        activeMembership(),
        isNull(teams.disbandedAt),
      ),
    )
    .orderBy(asc(teams.slug));
  return {
    userId: account.userId,
    playerId: account.player.id,
    playerSlug: account.player.slug,
    displayName: account.displayName,
    teamMemberships: memberships,
  };
}

const USERNAME = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Finish sign-up: name, username (becomes the profile URL), location and games. */
export async function completeProfile(input: {
  userId: string;
  displayName: string;
  username: string;
  countryCode: string;
  city: string;
  gameSlugs: string[];
  locale?: 'en' | 'ar';
}): Promise<{ playerSlug: string }> {
  const displayName = input.displayName.trim();
  const username = input.username.trim().toLowerCase();
  const countryCode = input.countryCode.trim().toUpperCase();
  const city = input.city.trim();
  const gameSlugs = [...new Set(input.gameSlugs)];
  if (displayName.length < 2 || displayName.length > 60) {
    throw new AuthError('invalid_profile', 'Your name must be 2–60 characters.');
  }
  if (!USERNAME.test(username) || username.includes('--')) {
    throw new AuthError(
      'invalid_profile',
      'Usernames are 3–30 lowercase letters, digits or hyphens.',
    );
  }
  if (!/^[A-Z]{2,3}$/.test(countryCode) || city.length < 2) {
    throw new AuthError('invalid_profile', 'Pick your country and city.');
  }
  if (gameSlugs.length === 0) throw new AuthError('invalid_profile', 'Pick at least one game.');

  const db = getDb();
  const gameRows = await db
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(inArray(games.slug, gameSlugs));
  if (gameRows.length !== gameSlugs.length) throw new AuthError('unknown_game', 'Unknown game.');

  const [existing] = await db
    .select({ id: players.id, slug: players.slug })
    .from(players)
    .where(eq(players.userId, input.userId))
    .limit(1);
  if (existing) return { playerSlug: existing.slug };

  try {
    return await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ displayName, locale: input.locale ?? 'en', updatedAt: new Date() })
        .where(eq(users.id, input.userId));
      const [p] = await tx
        .insert(players)
        .values({ userId: input.userId, slug: username, countryCode, city })
        .returning({ id: players.id, slug: players.slug });
      if (!p) throw new AuthError('invalid_profile', 'Could not create the profile.');
      for (const [i, slug] of gameSlugs.entries()) {
        const g = gameRows.find((r) => r.slug === slug);
        if (!g) continue;
        await tx.insert(playerGames).values({
          playerId: p.id,
          gameId: g.id,
          proficiencyLevel: i === 0 ? 'competitive' : 'intermediate',
        });
      }
      return { playerSlug: p.slug };
    });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (typeof err === 'object' && err && (err as { code?: string }).code === '23505') {
      throw new AuthError('username_taken', 'That username is taken. Pick another.');
    }
    throw err;
  }
}

/** Is a username free? (Profile-completion form hint.) */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const [p] = await getDb()
    .select({ id: players.id })
    .from(players)
    .where(eq(players.slug, username.trim().toLowerCase()))
    .limit(1);
  return !p;
}
