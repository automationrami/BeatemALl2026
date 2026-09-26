/**
 * The "Manage" hub: every organisation the user belongs to, with its review status, and the
 * venues and tournaments those organisations run.
 */

import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../client';
import { memberships } from '../schema/memberships';
import { organizations } from '../schema/organizations';
import { venues } from '../schema/venues';
import { tournaments } from '../schema/tournaments';
import { tournamentRegistrations } from '../schema/tournament_registrations';
import { games } from '../schema/games';

export type ManageHub = {
  organizations: {
    id: string;
    slug: string;
    name: string;
    tier: string;
    role: string;
    status: string;
    reviewNotes: string | null;
  }[];
  venues: {
    slug: string;
    name: string;
    city: string;
    status: string;
    isActive: boolean;
    reviewNotes: string | null;
    organizationSlug: string;
  }[];
  tournaments: {
    slug: string;
    name: string;
    status: string;
    game: string;
    startsAt: Date | null;
    entries: number;
    maxTeams: number;
    organizationSlug: string;
  }[];
};

export async function loadManageHub(userId: string): Promise<ManageHub> {
  const db = getDb();
  const orgs = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      tier: organizations.tier,
      role: memberships.role,
      status: organizations.verificationStatus,
      reviewNotes: organizations.reviewNotes,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), isNull(memberships.revokedAt)))
    .orderBy(organizations.name);
  if (orgs.length === 0) return { organizations: [], venues: [], tournaments: [] };

  const orgIds = orgs.map((o) => o.id);
  const slugById = new Map(orgs.map((o) => [o.id, o.slug]));

  const venueRows = await db
    .select({
      slug: venues.slug,
      name: venues.name,
      city: venues.city,
      status: venues.verificationStatus,
      isActive: venues.isActive,
      reviewNotes: venues.reviewNotes,
      organizationId: venues.organizationId,
    })
    .from(venues)
    .where(and(inArray(venues.organizationId, orgIds), isNull(venues.deletedAt)))
    .orderBy(venues.name);

  const tourRows = await db
    .select({
      id: tournaments.id,
      slug: tournaments.slug,
      name: tournaments.name,
      status: tournaments.status,
      game: games.name,
      startsAt: tournaments.startsAt,
      maxTeams: tournaments.maxTeams,
      organizationId: tournaments.organizationId,
    })
    .from(tournaments)
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .where(and(inArray(tournaments.organizationId, orgIds), isNull(tournaments.deletedAt)))
    .orderBy(desc(tournaments.createdAt))
    .limit(50);

  const counts =
    tourRows.length > 0
      ? await db
          .select({ tournamentId: tournamentRegistrations.tournamentId, n: count() })
          .from(tournamentRegistrations)
          .where(
            and(
              inArray(
                tournamentRegistrations.tournamentId,
                tourRows.map((t) => t.id),
              ),
              inArray(tournamentRegistrations.status, [
                'pending_payment',
                'confirmed',
                'checked_in',
              ]),
            ),
          )
          .groupBy(tournamentRegistrations.tournamentId)
      : [];
  const countBy = new Map(counts.map((c) => [c.tournamentId, c.n]));

  return {
    organizations: orgs,
    venues: venueRows.map(({ organizationId, ...v }) => ({
      ...v,
      organizationSlug: (organizationId && slugById.get(organizationId)) || '',
    })),
    tournaments: tourRows.map(({ id, organizationId, ...t }) => ({
      ...t,
      entries: countBy.get(id) ?? 0,
      organizationSlug: slugById.get(organizationId) ?? '',
    })),
  };
}
