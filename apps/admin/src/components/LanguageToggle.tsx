'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function LanguageToggle() {
  const locale = useLocale();
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
    <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--line-2)] bg-[rgba(255,255,255,0.03)]">
      <button
        type="button"
        onClick={() => switchTo('en')}
        disabled={pending}
        aria-pressed={locale === 'en'}
        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
          locale === 'en' ? 'bg-[var(--violet)] text-white' : 'text-[var(--t-3)] hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo('ar')}
        disabled={pending}
        aria-pressed={locale === 'ar'}
        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
          locale === 'ar' ? 'bg-[var(--violet)] text-white' : 'text-[var(--t-3)] hover:text-white'
        }`}
      >
        AR
      </button>
    </div>
  );
}
