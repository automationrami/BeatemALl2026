'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
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
  const locale = useLocale();
  const router = useRouter();
  const mounted = useHasMounted();
  const signedIn = useAuthDraft((s) => s.signedIn);

  const showSignedIn = mounted && signedIn;

  return (
    <section className="mb-16">
      <p className="bx-eyebrow mb-6">PHASE 1 · LOCALHOST · MOCK DATA</p>
      <h1 className="font-display font-medium text-[64px] md:text-[96px] leading-[0.9] tracking-[-0.04em] mb-6">
        {t('welcome')}
      </h1>
      <p className="text-[var(--t-3)] max-w-xl text-lg leading-relaxed mb-8">{t('subtitle')}</p>
      <div className="min-h-[52px] flex items-center">
        {showSignedIn ? (
          <Button tone="ghost" size="sm" onClick={() => signOut()}>
            {t('signOut')}
          </Button>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button tone="primary" size="lg" onClick={() => router.push(`/${locale}/sign-in`)}>
              {t('signedOutCta')} →
            </Button>
            <p className="text-[var(--t-4)] text-sm font-mono">{t('signedOutHint')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
