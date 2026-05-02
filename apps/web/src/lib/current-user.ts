/**
 * Server-side helper that bridges the persona cookie (read from `next/headers`) and the
 * pure DB layer (`@beat-em-all/db/queries`).
 *
 * Phase 1 only — replaced by Auth.js v5 session resolution in E1-S2.
 */

import 'server-only';
import { cookies } from 'next/headers';
import {
  PERSONA_COOKIE_NAME,
  coercePersonaSlug,
  loadUserByPersonaSlug,
  type CurrentUser,
  type PersonaSlug,
} from '@beat-em-all/db/queries';

export async function getCurrentPersonaSlug(): Promise<PersonaSlug> {
  const jar = await cookies();
  const raw = jar.get(PERSONA_COOKIE_NAME)?.value;
  return coercePersonaSlug(raw);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const slug = await getCurrentPersonaSlug();
  return loadUserByPersonaSlug(slug);
}
