// Auth-related types for the localhost mock flow.
// In Phase 9 these are replaced by Supabase Auth's session types — same shape, different source.

import type { GameId } from './game';

export type CountryCode = 'KW' | 'KSA' | 'AE' | 'BH' | 'QA' | 'OM';

export type CountryDialCode = {
  country: CountryCode;
  flag: string;
  /** E.164 prefix without the leading + */
  dial: string;
  /** Localised display label */
  label: { en: string; ar: string };
};

/** Phone in strict E.164 form (e.g. +96555504287). Validated by Zod in @beat-em-all/utils. */
export type PhoneE164 = string;

/** Six-digit OTP code, ASCII digits only. */
export type OtpCode = string;

/** What the user has accumulated through the onboarding wizard so far. */
export type OnboardingDraft = {
  phone: PhoneE164;
  selectedGames: GameId[];
};

/** Result of mocked sign-in / verification. */
export type AuthResult = { ok: true; needsOnboarding: boolean } | { ok: false; error: AuthError };

export type AuthError =
  | 'invalid_phone'
  | 'invalid_code'
  | 'rate_limited'
  | 'expired_code'
  | 'unknown';
