import { describe, expect, it } from 'vitest';
import {
  composeE164,
  gameSelectionSchema,
  normalisePhoneDigits,
  otpCodeSchema,
  phoneE164Schema,
  phoneInputSchema,
} from './auth-schemas';

describe('phoneE164Schema', () => {
  it('accepts a valid Kuwait number', () => {
    expect(phoneE164Schema.safeParse('+96555504287').success).toBe(true);
  });

  it('accepts a valid Saudi number', () => {
    expect(phoneE164Schema.safeParse('+966505551234').success).toBe(true);
  });

  it('rejects missing leading +', () => {
    expect(phoneE164Schema.safeParse('96555504287').success).toBe(false);
  });

  it('rejects letters', () => {
    expect(phoneE164Schema.safeParse('+9655ABC0287').success).toBe(false);
  });

  it('rejects too short numbers', () => {
    expect(phoneE164Schema.safeParse('+9655').success).toBe(false);
  });

  it('rejects too long numbers (16+ digits)', () => {
    expect(phoneE164Schema.safeParse('+9655550428712345').success).toBe(false);
  });

  it('trims surrounding whitespace before validation', () => {
    expect(phoneE164Schema.safeParse('  +96555504287  ').success).toBe(true);
  });
});

describe('phoneInputSchema (loose national-format)', () => {
  it('accepts digits with spaces', () => {
    expect(phoneInputSchema.safeParse('5550 4287').success).toBe(true);
  });

  it('accepts digits with dashes', () => {
    expect(phoneInputSchema.safeParse('555-04287').success).toBe(true);
  });

  it('rejects letters', () => {
    expect(phoneInputSchema.safeParse('555O4287').success).toBe(false);
  });

  it('rejects empty', () => {
    expect(phoneInputSchema.safeParse('').success).toBe(false);
  });
});

describe('normalisePhoneDigits + composeE164', () => {
  it('strips spaces and dashes', () => {
    expect(normalisePhoneDigits('5550 - 4287')).toBe('55504287');
  });

  it('composes a valid E.164 from a Kuwait dial code', () => {
    expect(composeE164('965', '5550 4287')).toBe('+96555504287');
  });
});

describe('otpCodeSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(otpCodeSchema.safeParse('123456').success).toBe(true);
  });

  it('rejects 5 digits', () => {
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
  });

  it('rejects 7 digits', () => {
    expect(otpCodeSchema.safeParse('1234567').success).toBe(false);
  });

  it('rejects letters mixed in', () => {
    expect(otpCodeSchema.safeParse('12345A').success).toBe(false);
  });
});

describe('gameSelectionSchema', () => {
  it('accepts a single game', () => {
    expect(gameSelectionSchema.safeParse(['valorant']).success).toBe(true);
  });

  it('accepts up to 6 games', () => {
    expect(
      gameSelectionSchema.safeParse(['cs2', 'valorant', 'lol', 'eafc', 'codm', 'tekken8']).success,
    ).toBe(true);
  });

  it('rejects empty selection', () => {
    expect(gameSelectionSchema.safeParse([]).success).toBe(false);
  });

  it('rejects more than 6 games', () => {
    expect(gameSelectionSchema.safeParse(['a', 'b', 'c', 'd', 'e', 'f', 'g']).success).toBe(false);
  });
});
