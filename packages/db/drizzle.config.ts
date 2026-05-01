import 'dotenv/config';
import type { Config } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  // eslint-disable-next-line no-console
  console.warn(
    '[drizzle.config] No DATABASE_URL or POSTGRES_URL env var set — drizzle-kit commands will fail until one is provided.',
  );
}

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: url ?? '',
  },
  strict: true,
  verbose: true,
} satisfies Config;
