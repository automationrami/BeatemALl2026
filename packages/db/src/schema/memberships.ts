/**
 * `memberships` — joins User to Organization with a role. Per DOMAIN_MODEL.md §3.2.
 */

import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';

export const membershipRoleEnum = pgEnum('membership_role', [
  'owner',
  'admin',
  'organizer',
  'moderator',
  'viewer',
]);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    role: membershipRoleEnum('role').notNull().default('viewer'),

    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().default(sql`now()`),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    userOrgIdx: uniqueIndex('memberships_user_id_organization_id_idx').on(
      table.userId,
      table.organizationId,
    ),
  }),
);

export type MembershipRow = typeof memberships.$inferSelect;
export type MembershipInsert = typeof memberships.$inferInsert;
