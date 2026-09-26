'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

/** EN / عربي switch, styled as the Championship Gold segmented track. */
export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(target: 'en' | 'ar') {
    if (target === locale) return;
    const segments = pathname.split('/');
    if (segments[1] === 'en' || segments[1] === 'ar') {
      segments[1] = target;
    } else {
      segments.unshift('', target);
    }
    const next = segments.join('/') || '/';
    startTransition(() => router.replace(next));
  }

  return (
    <div className="bx-seg" role="group" aria-label={t('language')}>
      <button
        type="button"
        onClick={() => switchTo('en')}
        disabled={pending}
        aria-pressed={locale === 'en'}
        lang="en"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo('ar')}
        disabled={pending}
        aria-pressed={locale === 'ar'}
        lang="ar"
      >
        عربي
      </button>
    </div>
  );
}
