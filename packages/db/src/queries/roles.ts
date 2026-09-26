/**
 * Role lookups shared by every write path.
 *
 * Team actions (challenge, book, register, pay) belong to the captain or co-captain
 * (DOMAIN_MODEL §4.2, epics E4/E6/TM-2 "As a captain…"). Organization actions (issue a
 * voucher, see venue bookings) belong to owners and admins (§3.2).
 */

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../client';
import { teamMembers, type TeamMemberRow } from '../schema/team_members';
import { memberships, type MembershipRow } from '../schema/memberships';
import { organizations } from '../schema/organizations';
import { venues } from '../schema/venues';

export type TeamRole = TeamMemberRow['role'];

export const TEAM_LEADER_ROLES: readonly TeamRole[] = ['captain', 'co_captain'];
export const ORG_MANAGER_ROLES: readonly MembershipRow['role'][] = ['owner', 'admin'];

export function isTeamLeaderRole(role: TeamRole | null | undefined): boolean {
  return !!role && TEAM_LEADER_ROLES.includes(role);
}

/** The player's role on the team, or null when they aren't on it. */
export async function loadTeamRole(playerId: string, teamId: string): Promise<TeamRole | null> {
  const db = getDb();
  const [row] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.playerId, playerId),
        eq(teamMembers.teamId, teamId),
        isNull(teamMembers.leftAt),
      ),
    )
    .limit(1);
  return row?.role ?? null;
}

export type ManagedOrganization = {
  id: string;
  slug: string;
  name: string;
  tier: string;
  role: MembershipRow['role'];
};

/** Organizations where the user is an owner or admin (active membership). */
export async function listManagedOrganizations(userId: string): Promise<ManagedOrganization[]> {
  const db = getDb();
  return db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      tier: organizations.tier,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.userId, userId),
        isNull(memberships.revokedAt),
        inArray(memberships.role, [...ORG_MANAGER_ROLES]),
      ),
    )
    .orderBy(organizations.name);
}

/** Ids of venues owned by organizations the user manages. */
export async function listManagedVenueIds(userId: string): Promise<string[]> {
  const orgs = await listManagedOrganizations(userId);
  if (orgs.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({ id: venues.id })
    .from(venues)
    .where(
      inArray(
        venues.organizationId,
        orgs.map((o) => o.id),
      ),
    );
  return rows.map((r) => r.id);
}
