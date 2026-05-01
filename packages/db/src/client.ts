/**
 * Neon-backed Postgres client. Uses `@neondatabase/serverless` HTTP driver, which works
 * out-of-the-box on Vercel Functions / Edge Runtime.
 *
 * Env vars (auto-injected by Vercel when a Neon Postgres database is connected to the project):
 *   DATABASE_URL          — pooled connection (use this for query traffic)
 *   DATABASE_URL_UNPOOLED — direct connection (use this for migrations only)
 *
 * Local dev: copy `.env.example` to `.env.local` and paste the same URLs. We fall back to
 * `POSTGRES_URL` for legacy compatibility with older `@vercel/postgres` setups.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function resolveUrl(): string {
  const url =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error(
      '[@beat-em-all/db] No database connection string. Set DATABASE_URL (or POSTGRES_URL) in your environment.',
    );
  }
  return url;
}

/**
 * Lazy singleton — defers reading the env var until first use, so importing this module
 * in code paths that never touch the DB (e.g. tests, type-checking) doesn't blow up.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    const sql = neon(resolveUrl());
    _db = drizzle(sql, { schema });
  }
  return _db;
}

/** Direct sql client — for healthchecks, raw queries, migration scripts. */
export function getSql() {
  return neon(resolveUrl());
}
