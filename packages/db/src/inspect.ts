/**
 * One-shot DB inspection script. Run with:
 *   pnpm --filter @beat-em-all/db tsx src/inspect.ts
 *
 * Lists existing tables, columns, types, FKs in the public schema. Used to diagnose
 * pre-existing data when migrating into a previously-used Postgres.
 */

import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) throw new Error('Set POSTGRES_URL_NON_POOLING.');
  const sql = postgres(url, { prepare: false, max: 1 });

  // eslint-disable-next-line no-console
  console.log('TABLES IN public:');
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  for (const t of tables) {
    // eslint-disable-next-line no-console
    console.log(`  - ${t.table_name}`);
  }

  // eslint-disable-next-line no-console
  console.log('\nDETAILED COLUMNS for tables matching our names:');
  const ours = ['users', 'players', 'player_games', 'games'];
  for (const tname of ours) {
    const cols = await sql<{ column_name: string; data_type: string }[]>`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tname}
      ORDER BY ordinal_position
    `;
    if (cols.length === 0) {
      // eslint-disable-next-line no-console
      console.log(`  ${tname}: (does not exist)`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`  ${tname}:`);
      for (const c of cols) {
        // eslint-disable-next-line no-console
        console.log(`    ${c.column_name} :: ${c.data_type}`);
      }
    }
  }

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
