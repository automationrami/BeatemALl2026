/** Voucher display state, shared by server pages and the client card (plain module, no 'use client'). */

export type VoucherCardData = {
  code: string;
  kind: 'unlimited' | 'stored_value';
  status: 'active' | 'revoked';
  valueKwd: number | null;
  balanceKwd: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: Date | string | null;
  note: string | null;
  issuer: { slug: string; name: string };
  team: { slug: string; name: string; tag: string } | null;
  venue: { slug: string; name: string } | null;
};

export type VoucherState = 'active' | 'revoked' | 'expired' | 'used_up';

export function voucherState(v: VoucherCardData, now = Date.now()): VoucherState {
  if (v.status === 'revoked') return 'revoked';
  if (v.expiresAt && new Date(v.expiresAt).getTime() <= now) return 'expired';
  if (v.maxRedemptions !== null && v.redemptionCount >= v.maxRedemptions) return 'used_up';
  if (v.kind === 'stored_value' && (v.balanceKwd ?? 0) <= 0) return 'used_up';
  return 'active';
}
