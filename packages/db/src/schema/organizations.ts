/**
 * `organizations` — multi-tenant root entity. Per DOMAIN_MODEL.md §3.1.
 *
 * Every entity that owns tournaments, venues, brand activations, etc. is an Organization.
 * KEC is `Organization #1` — NOT a hardcoded special case. Multi-tenant test:
 * "Could SEF do this same thing if they signed up tomorrow?"
 */

import { sql } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const organizationTierEnum = pgEnum('organization_tier', [
  'federation',
  'brand',
  'venue',
  'community',
  'personal',
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
  'suspended',
]);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    slug: text('slug').notNull(),
    tier: organizationTierEnum('tier').notNull(),
    countryCode: text('country_code').notNull(),

    description: text('description'),
    logoUrl: text('logo_url'),
    coverImageUrl: text('cover_image_url'),
    websiteUrl: text('website_url'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),

    /** Hex accent for the org's UI tinting. KEC defaults to cyan. */
    accentColor: text('accent_color'),

    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    isPublic: boolean('is_public').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    nameIdx: uniqueIndex('organizations_name_idx').on(table.name),
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
  }),
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;
