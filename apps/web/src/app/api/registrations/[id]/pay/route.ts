/**
 * POST /api/registrations/[id]/pay  body { voucherCode }
 *
 * Pays a `pending_payment` tournament entry fee in full with a voucher; the entry
 * becomes `confirmed`. Captain or co-captain of the registered team only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VoucherError, payRegistrationWithVoucher } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { voucherErrorResponse } from '@/lib/voucher-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ voucherCode: z.string().min(1).max(40) });

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const me = await getCurrentUser();
    const result = await payRegistrationWithVoucher({
      registrationId: id,
      code: parsed.data.voucherCode,
      byUserId: me.userId,
      byPlayerId: me.playerId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VoucherError) return voucherErrorResponse(err);
    console.error('[POST /api/registrations/[id]/pay] failed', err);
    return NextResponse.json(
      { error: 'internal', message: 'Something went wrong paying the entry fee.' },
      { status: 500 },
    );
  }
}
