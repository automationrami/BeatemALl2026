/**
 * Shared Postgres enum types. Keep these aligned with the discriminated unions in
 * `@beat-em-all/types` so the DB and TS layer agree on allowed values.
 *
 * Source: DOMAIN_MODEL.md §2, §3, §5.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

export const localeEnum = pgEnum('locale', ['en', 'ar']);

export const proficiencyLevelEnum = pgEnum('proficiency_level', [
  'casual',
  'intermediate',
  'advanced',
  'competitive',
  'pro',
]);

export const linkedAccountProviderEnum = pgEnum('linked_account_provider', [
  'steam',
  'riot',
  'psn',
  'xbox',
  'epic',
]);
