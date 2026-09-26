'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, LogOut } from 'lucide-react';
import { Button, useHasMounted } from '@beat-em-all/ui';
import { useAuthDraft, signOut } from '@beat-em-all/api-client';

/**
 * Top-of-page hero with two states (signed-out CTA / signed-in welcome).
 *
 * Layout-stability strategy:
 *   The signed-out variant is the default (matches server render). We always render
 *   the same outer <section> wrapper at the same dimensions; only the inner action
 *   row changes after the Zustand persist store has hydrated from localStorage.
 *   Reserved space prevents the height jump that would otherwise happen on reload.
 */
export function HomeAuthGate() {
  const t = useTranslations('home');
  const tProfile = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const mounted = useHasMounted();
  const signedIn = useAuthDraft((s) => s.signedIn);

  const showSignedIn = mounted && signedIn;
  const arrow = <ArrowRight className="bx-icon bx-flip" aria-hidden />;

  return (
    <section className="bx-card grid gap-4 bg-band bg-[linear-gradient(120deg,var(--gold-soft),transparent_55%)] p-6 text-on-band md:p-8">
      <h1 className="bx-display m-0 max-w-[20ch] text-on-band">{t('welcome')}</h1>
      <p className="m-0 max-w-[56ch] font-display text-[16px] leading-[22px] text-on-band-muted">
        {t('subtitle')}
      </p>
      <div className="mt-2 flex min-h-[52px] flex-wrap items-center gap-3">
        {showSignedIn ? (
          <>
            <Button variant="gold" onClick={() => router.push(`/${locale}/me`)}>
              {tProfile('viewProfile')}
              {arrow}
            </Button>
            <Button variant="ghost" size="sm" className="text-on-band" onClick={() => signOut()}>
              <LogOut className="bx-icon" aria-hidden />
              {t('signOut')}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button variant="gold" size="lg" onClick={() => router.push(`/${locale}/sign-in`)}>
              {t('signedOutCta')}
              {arrow}
            </Button>
            <p className="m-0 text-[13px] leading-[18px] text-on-band-muted">
              {t('signedOutHint')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
