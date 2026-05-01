import 'dotenv/config';
import type { Config } from 'drizzle-kit';

// Prefer the non-pooling connection for drizzle-kit (push, generate against introspection).
const url =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;
if (!url) {
  // eslint-disable-next-line no-console
  console.warn(
    '[drizzle.config] No POSTGRES_URL_NON_POOLING / POSTGRES_URL / DATABASE_URL env var set — drizzle-kit commands will fail until one is provided.',
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
