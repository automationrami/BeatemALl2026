/**
 * `notifications` — DOMAIN_MODEL.md §11.1. In-app channel only at this stage; push, SMS,
 * WhatsApp and email reuse the same rows once their providers are wired (P-1).
 *
 * Text is rendered from `type` + `data` through the i18n files so it follows the reader's
 * language; `title`/`body` hold an English fallback for other channels.
 */

import { sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'push',
  'email',
  'sms',
  'whatsapp',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** e.g. `team_invite`, `challenge_received`, `booking_cancelled`, `venue_approved`. */
    type: text('type').notNull(),
    channel: notificationChannelEnum('channel').notNull().default('in_app'),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    /** Deep link (`href`) plus the values the i18n message needs. */
    data: jsonb('data').$type<Record<string, string | number | null>>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    inboxIdx: index('notifications_recipient_idx').on(table.recipientUserId, table.createdAt),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
