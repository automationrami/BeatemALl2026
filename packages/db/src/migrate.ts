/**
 * Standalone migration runner. Use for `pnpm --filter @beat-em-all/db db:migrate`.
 *
 * Run this:
 *   - locally after a Vercel-Postgres branch is provisioned (DATABASE_URL_UNPOOLED in `.env.local`)
 *   - in CI / production via a GitHub Action when migrations need to be applied to prod
 *
 * IMPORTANT: This uses the UNPOOLED connection because pooled connections don't support
 * migrations (long-lived transactions, schema-altering statements). Vercel auto-injects
 * DATABASE_URL_UNPOOLED when a Neon Postgres database is connected to a project.
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

async function main() {
  const url =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      'Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL before running migrations.',
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[migrate] Applying migrations against ${redactUrl(url)}`);

  const sql = neon(url);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './migrations' });

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
