/**
 * /api/vouchers
 *   GET   → the viewer's voucher wallet (their teams' vouchers + redemptions) and, for
 *           organisation owners/admins, what their organisations have issued.
 *   POST  → issue a voucher for an organisation the viewer manages.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VoucherError, issueVoucher, loadVoucherWallet } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { voucherErrorResponse } from '@/lib/voucher-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const issueSchema = z
  .object({
    organizationSlug: z.string().min(1).max(80),
    kind: z.enum(['unlimited', 'stored_value']),
    valueKwd: z.number().positive().max(10_000).optional().nullable(),
    teamSlug: z.string().min(1).max(80).optional().nullable(),
    venueSlug: z.string().min(1).max(80).optional().nullable(),
    maxRedemptions: z.number().int().min(1).max(10_000).optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    code: z.string().min(4).max(40).optional().nullable(),
    note: z.string().max(200).optional().nullable(),
  })
  .refine((v) => v.kind === 'unlimited' || (v.valueKwd ?? 0) > 0, {
    message: 'A stored-value voucher needs an amount.',
    path: ['valueKwd'],
  });

export async function GET() {
  try {
    const me = await getCurrentUser();
    const wallet = await loadVoucherWallet({ userId: me.userId, playerId: me.playerId });
    return NextResponse.json(
      { ...wallet, viewer: { playerId: me.playerId, slug: me.playerSlug } },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[GET /api/vouchers] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong loading vouchers.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const me = await getCurrentUser();
    const voucher = await issueVoucher({
      byUserId: me.userId,
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });
    return NextResponse.json({ voucher }, { status: 201 });
  } catch (err) {
    if (err instanceof VoucherError) return voucherErrorResponse(err);
    console.error('[POST /api/vouchers] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong issuing the voucher.' },
      { status: 500 },
    );
  }
}
