/**
 * Organiser applications (ORG-1, story M-01).
 *
 * A signed-in user applies for a community or brand organisation. The organisation is
 * created `pending` with the applicant as its owner; Beat'Em All staff review it on /admin.
 * Until it is verified it cannot run tournaments (see `canManageOrganizationTournaments`).
 */

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { organizations, type OrganizationRow } from '../schema/organizations';
import { memberships, type MembershipRow } from '../schema/memberships';
import { PLATFORM_ORGANIZATION_SLUG } from './roles';
import { notify, organizationManagerUserIds } from './notifications';

export type OrganizationApplyInput = {
  userId: string;
  name: string;
  tier: 'community' | 'brand';
  countryCode: string;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone: string;
};

export class OrganizationApplyError extends Error {
  constructor(
    public code: 'name_taken' | 'invalid_name' | 'insert_failed',
    message: string,
  ) {
    super(message);
    this.name = 'OrganizationApplyError';
  }
}

/** URL-safe slug base from a display name; Arabic-only names fall back to `fallback`. */
export function slugBase(name: string, fallback: string): string {
  const base = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return base.length >= 2 ? base : fallback;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

async function uniqueOrganizationSlug(name: string): Promise<string> {
  const db = getDb();
  const base = slugBase(name, 'org');
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${randomSuffix()}`;
    const [hit] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    if (!hit) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function applyForOrganization(
  input: OrganizationApplyInput,
): Promise<{ organization: OrganizationRow; membership: MembershipRow }> {
  const db = getDb();
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 80) {
    throw new OrganizationApplyError('invalid_name', 'Name must be 3–80 characters.');
  }

  const [clash] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(sql`lower(${organizations.name}) = lower(${name})`)
    .limit(1);
  if (clash) {
    throw new OrganizationApplyError(
      'name_taken',
      `An organisation called "${name}" already exists.`,
    );
  }

  const slug = await uniqueOrganizationSlug(name);
  let created: { organization: OrganizationRow; membership: MembershipRow };
  try {
    created = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name,
          slug,
          tier: input.tier,
          countryCode: input.countryCode,
          description: input.description?.trim() || null,
          contactEmail: input.contactEmail?.trim() || null,
          contactPhone: input.contactPhone.trim(),
          verificationStatus: 'pending',
        })
        .returning();
      if (!org) throw new OrganizationApplyError('insert_failed', 'Insert returned no row.');
      const [membership] = await tx
        .insert(memberships)
        .values({
          userId: input.userId,
          organizationId: org.id,
          role: 'owner',
          acceptedAt: new Date(),
        })
        .returning();
      if (!membership) throw new OrganizationApplyError('insert_failed', 'Insert returned no row.');
      return { organization: org, membership };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new OrganizationApplyError(
        'name_taken',
        `An organisation called "${name}" already exists.`,
      );
    }
    throw err;
  }

  // Tell Beat'Em All staff there is something to review.
  const [platform] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, PLATFORM_ORGANIZATION_SLUG))
    .limit(1);
  if (platform) {
    await notify({
      recipientUserIds: await organizationManagerUserIds(platform.id),
      type: 'application_submitted',
      title: `New organiser application: ${name}`,
      // Same keys as the venue application so one message template covers both kinds.
      data: { href: '/admin', kind: 'organization', name, organization: name },
    });
  }

  return created;
}

export type MyOrganization = {
  id: string;
  slug: string;
  name: string;
  tier: OrganizationRow['tier'];
  verificationStatus: OrganizationRow['verificationStatus'];
  reviewNotes: string | null;
  role: MembershipRow['role'];
  createdAt: Date;
};

/** Organisations the user belongs to (any role), newest first, with review status. */
export async function listMyOrganizations(userId: string): Promise<MyOrganization[]> {
  return getDb()
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      tier: organizations.tier,
      verificationStatus: organizations.verificationStatus,
      reviewNotes: organizations.reviewNotes,
      role: memberships.role,
      createdAt: organizations.createdAt,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.userId, userId),
        isNull(memberships.revokedAt),
        isNull(organizations.deletedAt),
      ),
    )
    .orderBy(desc(organizations.createdAt));
}
