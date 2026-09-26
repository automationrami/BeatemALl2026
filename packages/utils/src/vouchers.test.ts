import { describe, expect, it } from 'vitest';
import {
  evaluateVoucher,
  generateVoucherCode,
  normalizeVoucherCode,
  roundKwd,
  type VoucherRuleInput,
  type VoucherUse,
} from './vouchers';

const now = new Date('2026-09-26T12:00:00Z');
const base: VoucherRuleInput = {
  kind: 'stored_value',
  status: 'active',
  balanceKwd: 50,
  teamId: null,
  venueId: null,
  maxRedemptions: null,
  redemptionCount: 0,
  expiresAt: null,
};
const use: VoucherUse = {
  now,
  amountKwd: 24,
  teamId: 'team-a',
  purpose: 'booking',
  venueId: 'venue-1',
};

describe('evaluateVoucher', () => {
  it('draws down a stored-value balance', () => {
    expect(evaluateVoucher(base, use)).toEqual({ ok: true, amountKwd: 24, balanceAfterKwd: 26 });
  });

  it('allows spending the exact remaining balance', () => {
    expect(evaluateVoucher({ ...base, balanceKwd: 24 }, use)).toEqual({
      ok: true,
      amountKwd: 24,
      balanceAfterKwd: 0,
    });
  });

  it('refuses when the balance is short', () => {
    expect(evaluateVoucher({ ...base, balanceKwd: 23.999 }, use)).toEqual({
      ok: false,
      reason: 'insufficient_balance',
    });
  });

  it('lets an unlimited voucher pay any amount, repeatedly', () => {
    const v = { ...base, kind: 'unlimited' as const, balanceKwd: null, redemptionCount: 500 };
    expect(evaluateVoucher(v, { ...use, amountKwd: 9_999 })).toEqual({
      ok: true,
      amountKwd: 9_999,
      balanceAfterKwd: null,
    });
  });

  it('enforces the redemption cap', () => {
    expect(evaluateVoucher({ ...base, maxRedemptions: 2, redemptionCount: 2 }, use)).toEqual({
      ok: false,
      reason: 'exhausted',
    });
    expect(evaluateVoucher({ ...base, maxRedemptions: 2, redemptionCount: 1 }, use).ok).toBe(true);
  });

  it('rejects revoked and expired vouchers', () => {
    expect(evaluateVoucher({ ...base, status: 'revoked' }, use)).toEqual({
      ok: false,
      reason: 'revoked',
    });
    expect(evaluateVoucher({ ...base, expiresAt: now }, use)).toEqual({
      ok: false,
      reason: 'expired',
    });
    expect(evaluateVoucher({ ...base, expiresAt: new Date(now.getTime() + 1000) }, use).ok).toBe(
      true,
    );
  });

  it('respects team scope', () => {
    expect(evaluateVoucher({ ...base, teamId: 'team-b' }, use)).toEqual({
      ok: false,
      reason: 'wrong_team',
    });
    expect(evaluateVoucher({ ...base, teamId: 'team-a' }, use).ok).toBe(true);
  });

  it('respects venue scope and keeps venue vouchers off tournament entries', () => {
    expect(evaluateVoucher({ ...base, venueId: 'venue-2' }, use)).toEqual({
      ok: false,
      reason: 'wrong_venue',
    });
    expect(evaluateVoucher({ ...base, venueId: 'venue-1' }, use).ok).toBe(true);
    expect(
      evaluateVoucher(
        { ...base, venueId: 'venue-1' },
        { ...use, purpose: 'tournament_entry', venueId: null },
      ),
    ).toEqual({ ok: false, reason: 'venue_only' });
  });

  it('refuses zero-amount payments', () => {
    expect(evaluateVoucher(base, { ...use, amountKwd: 0 })).toEqual({
      ok: false,
      reason: 'nothing_to_pay',
    });
  });
});

describe('voucher codes', () => {
  it('normalises case and spaces', () => {
    expect(normalizeVoucherCode(' kec-pilot 2026 ')).toBe('KEC-PILOT2026');
  });

  it('rejects malformed codes', () => {
    for (const bad of ['', 'ab', '-ABCD', 'ABCD-', 'AB--CD', 'ABC$D', 'A'.repeat(33)]) {
      expect(normalizeVoucherCode(bad)).toBeNull();
    }
  });

  it('generates valid, distinct codes with the issuer prefix', () => {
    const a = generateVoucherCode('Zain Kuwait');
    const b = generateVoucherCode('Zain Kuwait');
    expect(a).toMatch(/^ZAINKUWA-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeVoucherCode(a)).toBe(a);
    expect(a).not.toBe(b);
  });
});

describe('roundKwd', () => {
  it('rounds to fils', () => {
    expect(roundKwd(1.23456)).toBe(1.235);
    expect(roundKwd(0.1 + 0.2)).toBe(0.3);
  });
});
