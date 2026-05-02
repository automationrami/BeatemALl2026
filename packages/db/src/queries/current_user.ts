/**
 * Persona-as-current-user resolver — Phase-1 substitute for Auth.js v5.
 *
 * **Important**: this module is a pure function layer; it does NOT read cookies. The
 * caller (in `apps/web/src/lib/current-user.ts`) reads the `bx-current-persona` cookie
 * via `next/headers` and passes the resolved slug down. Keeping `next/headers` out of
 * `packages/db` preserves the package boundary — the DB layer is framework-agnostic.
 */

import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { players } from '../schema/players';
import { users } from '../schema/users';
import { teamMembers } from '../schema/team_members';
import { teams } from '../schema/teams';
import type { TeamMemberRow } from '../schema/team_members';

export const PERSONA_COOKIE_NAME = 'bx-current-persona';

export const VALID_PERSONA_SLUGS = [
  'khaled-al-mutairi',
  'sara-al-awadhi',
  'ahmad-al-rashed',
  'omar-al-saud',
  'fatima-al-mansour',
] as const;
export type PersonaSlug = (typeof VALID_PERSONA_SLUGS)[number];

/** Default persona when no cookie is set. */
export const DEFAULT_PERSONA_SLUG: PersonaSlug = 'khaled-al-mutairi';

export type CurrentUser = {
  userId: string;
  playerId: string;
  playerSlug: string;
  displayName: string;
  /** Active team memberships (accepted, not left) ordered by role precedence. */
  teamMemberships: Array<{
    teamId: string;
    teamSlug: string;
    teamName: string;
    role: TeamMemberRow['role'];
  }>;
};

/**
 * Coerce an unknown string to a valid persona slug — falls back to default.
 */
export function coercePersonaSlug(raw: string | undefined | null): PersonaSlug {
  if (!raw) return DEFAULT_PERSONA_SLUG;
  return (VALID_PERSONA_SLUGS as readonly string[]).includes(raw)
    ? (raw as PersonaSlug)
    : DEFAULT_PERSONA_SLUG;
}

/**
 * Resolve a persona slug to a full CurrentUser including their team memberships.
 * Throws when the persona slug doesn't have a player row (shouldn't happen in normal
 * operation since seeds populate all 5 personas).
 */
export async function loadUserByPersonaSlug(slug: PersonaSlug): Promise<CurrentUser> {
  const db = getDb();

  const rows = await db
    .select({
      userId: users.id,
      playerId: players.id,
      playerSlug: players.slug,
      displayName: users.displayName,
    })
    .from(players)
    .innerJoin(users, eq(users.id, players.userId))
    .where(eq(players.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error(`[currentUser] No player row for persona slug "${slug}"`);
  }

  const memberships = await db
    .select({
      teamId: teams.id,
      teamSlug: teams.slug,
      teamName: teams.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.playerId, row.playerId));

  return {
    userId: row.userId,
    playerId: row.playerId,
    playerSlug: row.playerSlug,
    displayName: row.displayName,
    teamMemberships: memberships,
  };
}
