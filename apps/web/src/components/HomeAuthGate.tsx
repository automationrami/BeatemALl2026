'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';
import { useAuthDraft, signOut } from '@beat-em-all/api-client';

/**
 * Top-of-page hero. Two states:
 *  - Signed in (auth-draft.signedIn = true OR persona switcher actively used)
 *      → shows the standard welcome + tagline
 *  - Signed out
 *      → shows a CTA to /sign-in + secondary "no account yet?" hint
 *
 * The persona switcher remains in the header for dev-mode persona swapping.
 */
export function HomeAuthGate() {
  const t = useTranslations('home');
  const locale = useLocale();
  const router = useRouter();
  const signedIn = useAuthDraft((s) => s.signedIn);

  if (!signedIn) {
    return (
      <section className="mb-16">
        <p className="bx-eyebrow mb-6">PHASE 1 · LOCALHOST · MOCK DATA</p>
        <h1 className="font-display font-medium text-[64px] md:text-[96px] leading-[0.9] tracking-[-0.04em] mb-6">
          {t('welcome')}
        </h1>
        <p className="text-[var(--t-3)] max-w-xl text-lg leading-relaxed mb-8">{t('subtitle')}</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button tone="primary" size="lg" onClick={() => router.push(`/${locale}/sign-in`)}>
            {t('signedOutCta')} →
          </Button>
          <p className="text-[var(--t-4)] text-sm font-mono">{t('signedOutHint')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="bx-eyebrow mb-6">PHASE 1 · LOCALHOST · MOCK DATA</p>
          <h1 className="font-display font-medium text-[64px] md:text-[96px] leading-[0.9] tracking-[-0.04em] mb-6">
            {t('welcome')}
          </h1>
          <p className="text-[var(--t-3)] max-w-xl text-lg leading-relaxed">{t('subtitle')}</p>
        </div>
        <Button tone="ghost" size="sm" onClick={() => signOut()}>
          {t('signOut')}
        </Button>
      </div>
    </section>
  );
}
