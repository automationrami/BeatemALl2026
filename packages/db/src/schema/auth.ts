/**
 * `auth_otps` — one-time sign-in codes for phone OTP (E1-S2). Infrastructure, not a domain
 * entity: only a hash of the code is stored, rows expire after 10 minutes and allow 5 tries.
 *
 * Sessions are stateless signed cookies (see `apps/web/src/lib/session.ts`), so there is no
 * sessions table.
 */

import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const authOtps = pgTable(
  'auth_otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phoneNumber: text('phone_number').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    phoneIdx: index('auth_otps_phone_idx').on(table.phoneNumber, table.createdAt),
  }),
);

export type AuthOtpRow = typeof authOtps.$inferSelect;
