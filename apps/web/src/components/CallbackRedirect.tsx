'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

/**
 * OAuth callback stub. Real Apple/Google OAuth lands in Phase 9.
 * Phase 1: just shows the loading screen for ~1.6s, then routes back to /sign-in.
 */
export function CallbackRedirect() {
  const locale = useLocale();
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.push(`/${locale}/sign-in`), 1600);
    return () => clearTimeout(timer);
  }, [locale, router]);
  return null;
}
