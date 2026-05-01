/**
 * `venues` — physical gaming venues. Per DOMAIN_MODEL.md §6.1.
 *
 * Owned by a Venue-tier Organization. Geo-fields (PostGIS) deferred to E5 with the rest
 * of the geo-discovery work; for Phase 1 we store lat/lng as plain numerics so the Home
 * Feed can compute haversine distances without enabling the postgis extension yet.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { verificationStatusEnum } from './organizations';

export const cancellationPolicyEnum = pgEnum('cancellation_policy', [
  'flexible',
  'moderate',
  'strict',
]);

export const venues = pgTable(
  'venues',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),

    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    countryCode: text('country_code').notNull(),
    city: text('city').notNull(),
    address: text('address'),

    /** Lat/lng — Phase-1 plain numerics; promote to PostGIS Point in E5. */
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),

    googleMapsPlaceId: text('google_maps_place_id'),
    phoneNumber: text('phone_number'),
    email: text('email'),

    coverImageUrl: text('cover_image_url'),

    totalSeats: integer('total_seats').notNull().default(0),
    pcSeats: integer('pc_seats').notNull().default(0),
    consoleSeats: integer('console_seats').notNull().default(0),
    mobileSeats: integer('mobile_seats').notNull().default(0),
    privateRoomsCount: integer('private_rooms_count').notNull().default(0),

    verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),

    defaultHourlyRateKwd: doublePrecision('default_hourly_rate_kwd').notNull().default(0),
    cancellationPolicy: cancellationPolicyEnum('cancellation_policy').notNull().default('moderate'),
    cancellationWindowHours: integer('cancellation_window_hours').notNull().default(24),

    /** Average rating 0-5, one decimal. Null until reviews ship. Computed by an aggregate job post-MVP. */
    rating: doublePrecision('rating'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex('venues_slug_idx').on(table.slug),
  }),
);

export type VenueRow = typeof venues.$inferSelect;
export type VenueInsert = typeof venues.$inferInsert;
