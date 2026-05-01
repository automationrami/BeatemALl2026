/**
 * Postgres client — DB-vendor-agnostic. Works against any Postgres reachable from a Vercel
 * Function (Vercel Postgres / Neon / Supabase / RDS / self-hosted).
 *
 * Driver: `postgres` (porsager) — single-connection per Function invocation, with the
 * Drizzle-recommended `prepare: false` flag so it plays nicely with PgBouncer-style
 * connection poolers (Supabase, RDS Proxy).
 *
 * Env vars (auto-injected by Vercel when a Postgres database is connected via the project's
 * Storage tab — including the Supabase, Neon, and Vercel-Postgres marketplace integrations):
 *
 *   POSTGRES_URL              — pooled connection (use this for query traffic in Functions)
 *   POSTGRES_URL_NON_POOLING  — direct connection (use this for migrations only)
 *
 * Local dev: copy `.vercel/.env.production.local` to `.env.local`, or paste the values from
 * the Vercel Storage tab. We accept `DATABASE_URL` as a fallback alias.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function resolveQueryUrl(): string {
  const url =
    process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[@beat-em-all/db] No database connection string. Set POSTGRES_URL (or DATABASE_URL) in your environment.',
    );
  }
  return url;
}

function resolveMigrationUrl(): string {
  // Migrations need a direct connection — pooled connections (PgBouncer transaction-mode) don't
  // support session-level features that schema migrations rely on.
  const url =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[@beat-em-all/db] No database connection string for migrations. Set POSTGRES_URL_NON_POOLING.',
    );
  }
  return url;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

function getQueryClient(): ReturnType<typeof postgres> {
  if (!_sql) {
    _sql = postgres(resolveQueryUrl(), {
      // PgBouncer transaction-mode pooling (Supabase / Neon pooled / RDS Proxy) breaks
      // prepared statements. Required for the pooled connection.
      prepare: false,
      // Vercel Functions are short-lived; cap idle so we don't hold connections open.
      idle_timeout: 20,
      max: 1,
    });
  }
  return _sql;
}

/**
 * Lazy singleton Drizzle ORM client. Defers reading the env var until first use, so
 * importing this module in code paths that never touch the DB (tests, type-checking)
 * doesn't blow up.
 */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _db = drizzle(getQueryClient(), { schema });
  }
  return _db;
}

/** Direct sql client — for healthchecks, raw queries, ad-hoc SQL. */
export function getSql(): ReturnType<typeof postgres> {
  return getQueryClient();
}

/**
 * Build a one-shot client for migrations using the NON-POOLING URL.
 * Caller is responsible for `.end()`-ing the connection.
 */
export function createMigrationClient(): ReturnType<typeof postgres> {
  return postgres(resolveMigrationUrl(), {
    prepare: false,
    max: 1,
  });
}
