/**
 * Beat'Em All operations: platform overview (A-02) and the application review queue (A-01).
 *
 * Staff = owners/admins of the platform organisation (`isPlatformAdmin`). A venue application
 * brings its own pending venue-tier organisation, so approving the venue approves that
 * organisation too and the organisation doesn't queue separately. Organisations applying
 * without a venue (tournament organisers: community or brand tier) queue on their own.
 */

import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { organizations, type OrganizationRow } from '../schema/organizations';
import { memberships } from '../schema/memberships';
import { venues, type VenueRow } from '../schema/venues';
import { venueGames } from '../schema/venue_games';
import { games } from '../schema/games';
import { venueBookings } from '../schema/venue_bookings';
import { players } from '../schema/players';
import { teams } from '../schema/teams';
import { tournaments } from '../schema/tournaments';
import { users } from '../schema/users';
import { notify, organizationManagerUserIds } from './notifications';
import { PLATFORM_ORGANIZATION_SLUG, isPlatformAdmin } from './roles';

export class AdminError extends Error {
  constructor(
    public code: 'forbidden' | 'not_found' | 'invalid_state' | 'reason_required',
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export type PlatformCounts = {
  players: number;
  teams: number;
  liveVenues: number;
  organizations: number;
  bookings: number;
  tournaments: number;
};

export type PendingVenueApplication = {
  slug: string;
  name: string;
  city: string;
  countryCode: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  description: string | null;
  hourlyRateKwd: number;
  totalSeats: number;
  opensAtTime: string;
  closesAtTime: string;
  isOpen24h: boolean;
  cancellationWindowHours: number;
  games: { name: string; seatsCount: number }[];
  organization: { slug: string; name: string } | null;
  applicant: string | null;
  submittedAt: Date;
};

export type PendingOrganizationApplication = {
  slug: string;
  name: string;
  tier: OrganizationRow['tier'];
  countryCode: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  applicant: string | null;
  submittedAt: Date;
};

export type PlatformOverview = {
  counts: PlatformCounts;
  pendingVenues: PendingVenueApplication[];
  pendingOrganizations: PendingOrganizationApplication[];
};

async function requireStaff(userId: string) {
  if (!(await isPlatformAdmin(userId))) {
    throw new AdminError('forbidden', "Only Beat'Em All staff can do this.");
  }
}

/** Display name of each organisation's first owner (the applicant). */
async function ownerNames(orgIds: string[]): Promise<Map<string, string>> {
  if (orgIds.length === 0) return new Map();
  const rows = await getDb()
    .select({ orgId: memberships.organizationId, name: users.displayName })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        inArray(memberships.organizationId, orgIds),
        eq(memberships.role, 'owner'),
        isNull(memberships.revokedAt),
      ),
    )
    .orderBy(asc(memberships.createdAt));
  const out = new Map<string, string>();
  for (const r of rows) if (!out.has(r.orgId) && r.name) out.set(r.orgId, r.name);
  return out;
}

export async function loadPlatformCounts(): Promise<PlatformCounts> {
  const db = getDb();
  const n = (rows: { n: number }[]) => rows[0]?.n ?? 0;
  const [p, t, v, o, b, tr] = await Promise.all([
    db.select({ n: count() }).from(players),
    db.select({ n: count() }).from(teams).where(isNull(teams.disbandedAt)),
    db
      .select({ n: count() })
      .from(venues)
      .where(
        and(
          eq(venues.verificationStatus, 'verified'),
          eq(venues.isActive, true),
          isNull(venues.deletedAt),
        ),
      ),
    db
      .select({ n: count() })
      .from(organizations)
      .where(
        and(
          isNull(organizations.deletedAt),
          sql`${organizations.slug} <> ${PLATFORM_ORGANIZATION_SLUG}`,
        ),
      ),
    db.select({ n: count() }).from(venueBookings),
    db.select({ n: count() }).from(tournaments).where(isNull(tournaments.deletedAt)),
  ]);
  return {
    players: n(p),
    teams: n(t),
    liveVenues: n(v),
    organizations: n(o),
    bookings: n(b),
    tournaments: n(tr),
  };
}

export async function listPendingVenueApplications(): Promise<PendingVenueApplication[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(venues)
    .where(and(eq(venues.verificationStatus, 'pending'), isNull(venues.deletedAt)))
    .orderBy(asc(venues.createdAt));
  if (rows.length === 0) return [];

  const venueIds = rows.map((v) => v.id);
  const orgIds = [...new Set(rows.map((v) => v.organizationId).filter((x): x is string => !!x))];
  const [gameRows, orgRows, owners] = await Promise.all([
    db
      .select({ venueId: venueGames.venueId, name: games.name, seatsCount: venueGames.seatsCount })
      .from(venueGames)
      .innerJoin(games, eq(games.id, venueGames.gameId))
      .where(inArray(venueGames.venueId, venueIds))
      .orderBy(asc(games.name)),
    orgIds.length > 0
      ? db
          .select({ id: organizations.id, slug: organizations.slug, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : Promise.resolve([] as { id: string; slug: string; name: string }[]),
    ownerNames(orgIds),
  ]);
  const orgById = new Map(orgRows.map((o) => [o.id, o]));

  return rows.map((v: VenueRow) => {
    const org = v.organizationId ? orgById.get(v.organizationId) : undefined;
    return {
      slug: v.slug,
      name: v.name,
      city: v.city,
      countryCode: v.countryCode,
      address: v.address,
      phoneNumber: v.phoneNumber,
      email: v.email,
      description: v.description,
      hourlyRateKwd: v.defaultHourlyRateKwd,
      totalSeats: v.totalSeats,
      opensAtTime: v.opensAtTime,
      closesAtTime: v.closesAtTime,
      isOpen24h: v.isOpen24h,
      cancellationWindowHours: v.cancellationWindowHours,
      games: gameRows
        .filter((g) => g.venueId === v.id)
        .map((g) => ({ name: g.name, seatsCount: g.seatsCount })),
      organization: org ? { slug: org.slug, name: org.name } : null,
      applicant: v.organizationId ? (owners.get(v.organizationId) ?? null) : null,
      submittedAt: v.createdAt,
    };
  });
}

/** Pending organisations that aren't reviewed through one of their venues. */
export async function listPendingOrganizationApplications(): Promise<
  PendingOrganizationApplication[]
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(organizations)
    .where(
      and(
        eq(organizations.verificationStatus, 'pending'),
        isNull(organizations.deletedAt),
        sql`not exists (select 1 from ${venues} where ${venues.organizationId} = ${organizations.id} and ${venues.verificationStatus} = 'pending' and ${venues.deletedAt} is null)`,
      ),
    )
    .orderBy(asc(organizations.createdAt));
  const owners = await ownerNames(rows.map((o) => o.id));
  return rows.map((o) => ({
    slug: o.slug,
    name: o.name,
    tier: o.tier,
    countryCode: o.countryCode,
    description: o.description,
    contactEmail: o.contactEmail,
    contactPhone: o.contactPhone,
    applicant: owners.get(o.id) ?? null,
    submittedAt: o.createdAt,
  }));
}

export async function loadPlatformOverview(): Promise<PlatformOverview> {
  const [counts, pendingVenues, pendingOrganizations] = await Promise.all([
    loadPlatformCounts(),
    listPendingVenueApplications(),
    listPendingOrganizationApplications(),
  ]);
  return { counts, pendingVenues, pendingOrganizations };
}

export type ReviewAction = 'approve' | 'reject';

function requireReason(action: ReviewAction, reason?: string | null): string | null {
  const r = reason?.trim() || null;
  if (action === 'reject' && !r) {
    throw new AdminError('reason_required', 'Give the applicant a reason for the rejection.');
  }
  return r;
}

/** A-01: approve (goes live, org approved too) or reject a venue application. */
export async function reviewVenueApplication(input: {
  slug: string;
  action: ReviewAction;
  reason?: string | null;
  reviewerUserId: string;
}): Promise<{ status: VenueRow['verificationStatus'] }> {
  await requireStaff(input.reviewerUserId);
  const reason = requireReason(input.action, input.reason);
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [venue] = await tx
      .select()
      .from(venues)
      .where(and(eq(venues.slug, input.slug), isNull(venues.deletedAt)))
      .for('update')
      .limit(1);
    if (!venue) throw new AdminError('not_found', 'Venue not found.');
    const allowed =
      input.action === 'approve'
        ? ['pending', 'rejected', 'unverified']
        : ['pending', 'unverified'];
    if (!allowed.includes(venue.verificationStatus)) {
      throw new AdminError('invalid_state', `This venue is already ${venue.verificationStatus}.`);
    }
    const now = new Date();
    const status = input.action === 'approve' ? ('verified' as const) : ('rejected' as const);
    await tx
      .update(venues)
      .set({
        verificationStatus: status,
        verifiedAt: status === 'verified' ? now : null,
        reviewNotes: status === 'verified' ? null : reason,
        updatedAt: now,
      })
      .where(eq(venues.id, venue.id));

    // The venue's own organisation rides along while it's still under review.
    if (venue.organizationId) {
      await tx
        .update(organizations)
        .set(
          status === 'verified'
            ? {
                verificationStatus: 'verified',
                verifiedAt: now,
                verifiedByUserId: input.reviewerUserId,
                reviewNotes: null,
                updatedAt: now,
              }
            : { verificationStatus: 'rejected', reviewNotes: reason, updatedAt: now },
        )
        .where(
          and(
            eq(organizations.id, venue.organizationId),
            inArray(
              organizations.verificationStatus,
              status === 'verified' ? ['pending', 'rejected', 'unverified'] : ['pending'],
            ),
          ),
        );
    }
    return { venue, status };
  });

  if (result.venue.organizationId) {
    await notify({
      recipientUserIds: await organizationManagerUserIds(result.venue.organizationId),
      type: result.status === 'verified' ? 'venue_approved' : 'venue_rejected',
      title:
        result.status === 'verified'
          ? `${result.venue.name} is live on Beat'Em All`
          : `${result.venue.name} was not approved`,
      data: {
        href: `/manage/venues/${result.venue.slug}`,
        venue: result.venue.name,
        reason,
      },
    });
  }
  return { status: result.status };
}

/** A-01: approve or reject an organisation application (any tier). */
export async function reviewOrganizationApplication(input: {
  slug: string;
  action: ReviewAction;
  reason?: string | null;
  reviewerUserId: string;
}): Promise<{ status: OrganizationRow['verificationStatus'] }> {
  await requireStaff(input.reviewerUserId);
  const reason = requireReason(input.action, input.reason);
  const db = getDb();

  const org = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(organizations)
      .where(and(eq(organizations.slug, input.slug), isNull(organizations.deletedAt)))
      .for('update')
      .limit(1);
    if (!row) throw new AdminError('not_found', 'Organisation not found.');
    const allowed =
      input.action === 'approve'
        ? ['pending', 'rejected', 'unverified']
        : ['pending', 'unverified'];
    if (!allowed.includes(row.verificationStatus)) {
      throw new AdminError(
        'invalid_state',
        `This organisation is already ${row.verificationStatus}.`,
      );
    }
    const now = new Date();
    await tx
      .update(organizations)
      .set(
        input.action === 'approve'
          ? {
              verificationStatus: 'verified',
              verifiedAt: now,
              verifiedByUserId: input.reviewerUserId,
              reviewNotes: null,
              updatedAt: now,
            }
          : { verificationStatus: 'rejected', reviewNotes: reason, updatedAt: now },
      )
      .where(eq(organizations.id, row.id));
    return row;
  });

  const status = input.action === 'approve' ? ('verified' as const) : ('rejected' as const);
  await notify({
    recipientUserIds: await organizationManagerUserIds(org.id),
    type: status === 'verified' ? 'organization_approved' : 'organization_rejected',
    title:
      status === 'verified'
        ? `${org.name} is approved on Beat'Em All`
        : `${org.name} was not approved`,
    data: { href: '/manage', organization: org.name, reason },
  });
  return { status };
}
