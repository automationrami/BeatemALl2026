'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight, MapPin, Swords, Trophy } from 'lucide-react';

type Action = {
  i18nKeyTitle: string;
  i18nKeyCaption: string;
  href: string;
  icon: typeof Swords;
};

const ACTIONS: Action[] = [
  {
    i18nKeyTitle: 'challengeTitle',
    i18nKeyCaption: 'challengeCaption',
    href: '/discover/teams',
    icon: Swords,
  },
  {
    i18nKeyTitle: 'tournamentsTitle',
    i18nKeyCaption: 'tournamentsCaption',
    href: '/tournaments',
    icon: Trophy,
  },
  {
    i18nKeyTitle: 'venuesTitle',
    i18nKeyCaption: 'venuesCaption',
    href: '/venues',
    icon: MapPin,
  },
];

/** Three shortcut tiles under the hero: challenge, tournaments, venues. */
export function QuickActions() {
  const t = useTranslations('home.quickActions');
  const locale = useLocale();

  return (
    <nav aria-label={t('title')} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={`/${locale}${a.href}`}
            className="bx-card bx-card--flat group flex items-center gap-4 p-4 transition-colors hover:bg-surface-200 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
          >
            <span
              className="grid size-12 shrink-0 place-items-center rounded-md bg-gold-soft text-gold-text"
              aria-hidden
            >
              <Icon className="bx-icon" />
            </span>
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="truncate font-display text-[16px] font-bold leading-[20px] text-ink">
                {t(a.i18nKeyTitle)}
              </span>
              <span className="truncate text-[13px] leading-[16px] text-ink-muted">
                {t(a.i18nKeyCaption)}
              </span>
            </span>
            <ChevronRight
              className="bx-icon bx-flip text-ink-muted transition-colors group-hover:text-gold-text"
              aria-hidden
            />
          </Link>
        );
      })}
    </nav>
  );
}
