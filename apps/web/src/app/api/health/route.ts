/**
 * GET /api/health — public health endpoint.
 *
 * Reports app + database status. Used by:
 *   - manual sanity checks (`curl https://beat-em-all.vercel.app/api/health`)
 *   - uptime monitoring once we wire it
 *   - the deploy-verification step in our release process
 *
 * The DB ping uses Drizzle through the lazy `getSql` client so that this route still works
 * (returning `database.connected: false`) when DATABASE_URL is unset — important for builds
 * that happen before Vercel Postgres is provisioned.
 */

import { NextResponse } from 'next/server';
import { getSql } from '@beat-em-all/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DbState = { connected: true; serverTime: string } | { connected: false; error: string };

export async function GET() {
  const start = Date.now();
  const database = await pingDb();
  const latencyMs = Date.now() - start;

  const status = database.connected ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      service: 'beat-em-all-web',
      database,
      runtime: 'nodejs',
      region: process.env.VERCEL_REGION ?? null,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      latencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: status === 'ok' ? 200 : 503 },
  );
}

async function pingDb(): Promise<DbState> {
  try {
    const sql = getSql();
    const rows = await sql`SELECT now() AS server_time`;
    const first = rows[0];
    const serverTime =
      first && typeof first.server_time !== 'undefined'
        ? new Date(first.server_time as string | number | Date).toISOString()
        : new Date().toISOString();
    return { connected: true, serverTime };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
