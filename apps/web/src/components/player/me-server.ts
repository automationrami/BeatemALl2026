import 'server-only';
import { redirect } from 'next/navigation';
import type { CurrentUser } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

/** The signed-in player for `/me` pages; unfinished profiles go to onboarding, others sign in. */
export async function requireMe(locale: string): Promise<CurrentUser> {
  try {
    return await getCurrentUser();
  } catch (err) {
    const incomplete = (err as { code?: string } | null)?.code === 'profile_incomplete';
    redirect(incomplete ? `/${locale}/onboarding` : `/${locale}/sign-in`);
  }
}

/** GCC countries offered on profile forms, plus the player's current code if it isn't one. */
export function countryOptions(locale: string, current: string): { code: string; name: string }[] {
  const codes = ['KW', 'SA', 'AE', 'BH', 'QA', 'OM'];
  if (current && !codes.includes(current)) codes.push(current);
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    names = null;
  }
  return codes.map((code) => {
    let name = code;
    try {
      name = names?.of(code) ?? code;
    } catch {
      // Non-ISO codes (e.g. "KSA") keep the raw code.
    }
    return { code, name };
  });
}
