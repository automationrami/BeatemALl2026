/**
 * `teams` table — competitive teams. Per DOMAIN_MODEL.md §4.1.
 *
 * Teams are NOT owned by an Organization. They're independent competitive entities;
 * Twisted Minds / Geekay etc. are Teams in our model. Multi-tenant rule still applies:
 * tournament organizers (KEC, etc.) interact with Teams as registrants, not subordinates.
 *
 * `geo_location` deferred to E5 (geographic discovery) — same reasoning as players.geo_location.
 */

import { sql } from 'drizzle-orm';
import { boolean, date, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    /** 2–6 char team tag, e.g. `SND` for Sandstorm. */
    tag: text('tag').notNull(),
    slug: text('slug').notNull(),

    countryCode: text('country_code').notNull(),
    city: text('city'),
    bio: text('bio'),

    logoUrl: text('logo_url'),
    coverImageUrl: text('cover_image_url'),

    isPublic: boolean('is_public').notNull().default(true),
    isRecruiting: boolean('is_recruiting').notNull().default(false),

    foundedAt: date('founded_at'),
    disbandedAt: timestamp('disbanded_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    slugIdx: uniqueIndex('teams_slug_idx').on(table.slug),
  }),
);

export type TeamRow = typeof teams.$inferSelect;
export type TeamInsert = typeof teams.$inferInsert;
