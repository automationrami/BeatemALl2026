/**
 * `users` table — base account entity. Per DOMAIN_MODEL.md §2.1.
 *
 * Phone number is the primary identifier in MENA. Email is optional. Auth.js will reference
 * this table via its credentials adapter once E1-S2 lands.
 */

import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { localeEnum } from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** E.164 phone, e.g. +96555504287. Validated app-side via packages/utils/auth-schemas. */
    phoneNumber: text('phone_number').notNull(),
    email: text('email'),

    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),

    locale: localeEnum('locale').notNull().default('en'),

    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    phoneNumberIdx: uniqueIndex('users_phone_number_idx').on(table.phoneNumber),
    emailIdx: uniqueIndex('users_email_idx').on(table.email).where(sql`${table.email} IS NOT NULL`),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
