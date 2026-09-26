/**
 * Voucher rules shared by the API (authoritative) and the UI (preview).
 *
 * A voucher pays one booking or one tournament entry in full. `unlimited` vouchers cover
 * any amount; `stored_value` vouchers draw down a KWD balance.
 */

export type VoucherKind = 'unlimited' | 'stored_value';
export type VoucherPurpose = 'booking' | 'tournament_entry';

export type VoucherRejection =
  | 'revoked'
  | 'expired'
  | 'exhausted'
  | 'wrong_team'
  | 'wrong_venue'
  | 'venue_only'
  | 'insufficient_balance'
  | 'nothing_to_pay';

export type VoucherRuleInput = {
  kind: VoucherKind;
  status: 'active' | 'revoked';
  balanceKwd: number | null;
  teamId: string | null;
  venueId: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: Date | null;
};

export type VoucherUse = {
  now: Date;
  amountKwd: number;
  teamId: string;
  purpose: VoucherPurpose;
  /** The venue being booked; null for tournament entries. */
  venueId: string | null;
};

export type VoucherEvaluation =
  | { ok: true; amountKwd: number; balanceAfterKwd: number | null }
  | { ok: false; reason: VoucherRejection };

/** KWD is quoted to 3 decimals (fils). */
export function roundKwd(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const CODE_RE = /^[A-Z0-9](?:[A-Z0-9-]{2,30})[A-Z0-9]$/;

/** Upper-cases and strips spaces. Returns null when the result isn't a valid code. */
export function normalizeVoucherCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, '').toUpperCase();
  return CODE_RE.test(code) && !code.includes('--') ? code : null;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

/** `PREFIX-XXXX-XXXX` from a cryptographically random source. */
export function generateVoucherCode(prefix: string): string {
  const clean =
    prefix
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8) || 'BX';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${clean}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Decide whether a voucher can pay `use.amountKwd` right now, and what it leaves behind. */
export function evaluateVoucher(v: VoucherRuleInput, use: VoucherUse): VoucherEvaluation {
  if (v.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (v.expiresAt && v.expiresAt.getTime() <= use.now.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  if (v.maxRedemptions !== null && v.redemptionCount >= v.maxRedemptions) {
    return { ok: false, reason: 'exhausted' };
  }
  if (v.teamId && v.teamId !== use.teamId) return { ok: false, reason: 'wrong_team' };
  if (v.venueId) {
    if (use.purpose !== 'booking') return { ok: false, reason: 'venue_only' };
    if (v.venueId !== use.venueId) return { ok: false, reason: 'wrong_venue' };
  }

  const amount = roundKwd(use.amountKwd);
  if (!(amount > 0)) return { ok: false, reason: 'nothing_to_pay' };

  if (v.kind === 'unlimited') return { ok: true, amountKwd: amount, balanceAfterKwd: null };

  const balance = roundKwd(v.balanceKwd ?? 0);
  if (balance < amount) return { ok: false, reason: 'insufficient_balance' };
  return { ok: true, amountKwd: amount, balanceAfterKwd: roundKwd(balance - amount) };
}
