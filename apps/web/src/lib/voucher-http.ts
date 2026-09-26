import 'server-only';
import { NextResponse } from 'next/server';
import type { VoucherError } from '@beat-em-all/db/queries';

const STATUS_BY_CODE: Record<VoucherError['code'], number> = {
  invalid_code: 400,
  invalid_value: 400,
  not_found: 404,
  team_not_found: 404,
  venue_not_found: 404,
  organization_not_found: 404,
  forbidden: 403,
  captain_only: 403,
  code_taken: 409,
  already_paid: 409,
  invalid_state: 409,
  revoked: 409,
  expired: 409,
  exhausted: 409,
  wrong_team: 409,
  wrong_venue: 409,
  venue_only: 409,
  insufficient_balance: 409,
  nothing_to_pay: 409,
  insert_failed: 500,
};

/** Every voucher failure carries a stable `error` code and a message safe to show users. */
export function voucherErrorResponse(err: VoucherError) {
  if (err.code === 'insert_failed') {
    console.error('[voucher] insert_failed', err);
    return NextResponse.json(
      { error: err.code, message: 'Could not save the voucher. Please try again.' },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { error: err.code, message: err.message },
    { status: STATUS_BY_CODE[err.code] ?? 400 },
  );
}
