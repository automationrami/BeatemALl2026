'use client';

import { useTranslations } from 'next-intl';
import type { HomeFeedData } from '@beat-em-all/types';

type Props = { viewer: HomeFeedData['viewer'] };

export function GreetingStrip({ viewer }: Props) {
  const t = useTranslations('home');

  // Strip the family name for the greeting — keeps the line tight on mobile.
  const firstName = viewer.displayName.split(' ')[0] ?? viewer.displayName;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <h1 className="font-display font-medium text-[28px] md:text-[36px] tracking-[-0.02em]">
        {t(`greeting.${viewer.greetingBucket}`, { name: firstName })}
      </h1>
      <span className="bx-eyebrow hidden sm:inline">{t('phaseBanner')}</span>
    </div>
  );
}
