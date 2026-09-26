'use client';

import { useTranslations } from 'next-intl';
import type { HomeFeedData } from '@beat-em-all/types';

type Props = { viewer: HomeFeedData['viewer'] };

/** Page title for Home: the time-of-day greeting and the one-line product promise. */
export function GreetingStrip({ viewer }: Props) {
  const t = useTranslations('home');

  // Strip the family name for the greeting — keeps the line tight on mobile.
  const firstName = viewer.displayName.split(' ')[0] ?? viewer.displayName;

  return (
    <header className="grid gap-3">
      <h1 className="bx-display m-0">
        {t(`greeting.${viewer.greetingBucket}`, { name: firstName })}
      </h1>
      <p className="m-0 max-w-[60ch] font-display text-[16px] leading-[22px] text-ink-muted">
        {t('subtitle')}
      </p>
    </header>
  );
}
