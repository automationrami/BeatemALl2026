/**
 * Standalone migration runner. Use for `pnpm --filter @beat-em-all/db db:migrate`.
 *
 * Run this:
 *   - locally after a Postgres database is connected to the Vercel project (env vars in `.env.local`)
 *   - in CI / production via a GitHub Action when migrations need to be applied to prod
 *
 * IMPORTANT: This uses the NON-POOLING connection (`POSTGRES_URL_NON_POOLING`) because pooled
 * connections (PgBouncer transaction-mode) don't support the schema-altering statements
 * Drizzle migrations rely on.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createMigrationClient } from './client';

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      'Set POSTGRES_URL_NON_POOLING (preferred) or DATABASE_URL_UNPOOLED before running migrations.',
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[migrate] Applying migrations against ${redactUrl(url)}`);

  const sql = createMigrationClient();
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './migrations' });

  await sql.end({ timeout: 5 });

  // eslint-disable-next-line no-console
  console.log('[migrate] Done.');
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<unparseable URL>';
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
