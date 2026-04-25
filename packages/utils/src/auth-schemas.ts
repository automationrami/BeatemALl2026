import { z } from 'zod';
import type { GameId } from '@beat-em-all/types';

/**
 * E.164 phone validation. Strict: must start with + then 7-15 ASCII digits.
 * The country dial code (e.g. 965 for Kuwait) is part of the digit count.
 */
export const phoneE164Schema = z
  .string()
  .trim()
  .regex(/^\+\d{7,15}$/, 'Invalid phone number');

/** Loose national-format input — digits, spaces, dashes allowed. UI normalises before validation. */
export const phoneInputSchema = z
  .string()
  .trim()
  .min(6, 'Too short')
  .max(20, 'Too long')
  .regex(/^[\d\s\-]+$/, 'Digits only');

/** Strip everything but ASCII digits, useful before joining with a dial code. */
export function normalisePhoneDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

/** Compose an E.164 phone string from a dial code (no +) and national digits. */
export function composeE164(dial: string, national: string): string {
  return `+${dial}${normalisePhoneDigits(national)}`;
}

/**
 * 6-digit OTP. ASCII digits only.
 * In Phase 1 (mock) we accept ANY 6 digits; the schema only validates shape.
 */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

/** Onboarding step 4: at least one game selected, max 6 (the MVP catalogue size). */
export const gameSelectionSchema = z
  .array(z.string())
  .min(1, 'Pick at least one game')
  .max(6, 'Too many games selected') as z.ZodType<GameId[]>;
