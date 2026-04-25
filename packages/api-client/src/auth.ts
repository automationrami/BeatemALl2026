'use client';

/**
 * Mock auth flow for Phase 1 / localhost.
 * In Phase 9 these functions are replaced with Supabase Auth calls — same shapes, same return contracts.
 *
 * The mock contract:
 *   - signIn(phone)     → routes to /verify; stores draft phone
 *   - verifyOtp(code)   → accepts ANY 6 digits; routes to /onboarding for new users, / for returning
 *   - completeOnboarding(games) → finalises the act-as persona based on phone (Kuwait → Khaled, KSA → Omar, etc.)
 *
 * No real SMS, no real Supabase. Only client-side state via the `useActAsPersona` Zustand store + a small auth-draft store.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthError, AuthResult, GameId, OtpCode, PhoneE164 } from '@beat-em-all/types';
import { phoneE164Schema, otpCodeSchema, gameSelectionSchema } from '@beat-em-all/utils';
import { useActAsPersona, type PersonaId } from './persona-store';

// ---- Auth-draft store (carries state between /sign-in → /verify → /onboarding) ----

type AuthDraftState = {
  phone: PhoneE164 | null;
  setPhone: (p: PhoneE164) => void;
  selectedGames: GameId[];
  setSelectedGames: (g: GameId[]) => void;
  signedIn: boolean;
  setSignedIn: (v: boolean) => void;
  reset: () => void;
};

export const useAuthDraft = create<AuthDraftState>()(
  persist(
    (set) => ({
      phone: null,
      setPhone: (p) => set({ phone: p }),
      selectedGames: [],
      setSelectedGames: (g) => set({ selectedGames: g }),
      signedIn: false,
      setSignedIn: (v) => set({ signedIn: v }),
      reset: () => set({ phone: null, selectedGames: [], signedIn: false }),
    }),
    {
      name: 'beat-em-all:auth-draft',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ---- Mock API ----

/** Mock SMS send. Validates the phone, stores it as a draft, returns ok or error. */
export function signIn(phone: PhoneE164): AuthResult {
  const parsed = phoneE164Schema.safeParse(phone);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_phone' };
  }
  useAuthDraft.getState().setPhone(parsed.data);
  return { ok: true, needsOnboarding: true };
}

/** Mock OTP verification. Accepts ANY 6-digit code (real Unifonic check happens in Phase 9). */
export function verifyOtp(code: OtpCode): AuthResult {
  const parsed = otpCodeSchema.safeParse(code);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_code' };
  }
  return { ok: true, needsOnboarding: true };
}

/**
 * Mock onboarding completion. Picks a persona based on the entered phone's country dial code:
 *   +965* → Khaled    (Kuwait)
 *   +966* → Omar      (KSA)
 *   default → Khaled
 * Persists the selected games on the auth draft + flips signedIn to true + activates the persona.
 */
export function completeOnboarding(games: GameId[]): AuthResult {
  const parsed = gameSelectionSchema.safeParse(games);
  if (!parsed.success) {
    return { ok: false, error: 'unknown' };
  }

  const draft = useAuthDraft.getState();
  draft.setSelectedGames(parsed.data);
  draft.setSignedIn(true);

  const persona = inferPersonaFromPhone(draft.phone);
  useActAsPersona.getState().setActivePersona(persona);
  return { ok: true, needsOnboarding: false };
}

/** Sign out — clears the auth draft and resets the act-as persona to the default. */
export function signOut(): void {
  useAuthDraft.getState().reset();
  useActAsPersona.getState().setActivePersona('khaled');
}

function inferPersonaFromPhone(phone: PhoneE164 | null): PersonaId {
  if (!phone) return 'khaled';
  if (phone.startsWith('+966')) return 'omar';
  if (phone.startsWith('+971')) return 'fatima';
  if (phone.startsWith('+965')) return 'khaled';
  return 'khaled';
}

export type { AuthError, AuthResult, OtpCode, PhoneE164 };
