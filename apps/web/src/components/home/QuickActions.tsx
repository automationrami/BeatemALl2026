'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { MapPin, Swords, Trophy } from 'lucide-react';

type Action = {
  i18nKeyTitle: string;
  i18nKeyCaption: string;
  href: string;
  icon: typeof Swords;
  accent: string;
  bg: string;
  border: string;
};

const ACTIONS: Action[] = [
  {
    i18nKeyTitle: 'challengeTitle',
    i18nKeyCaption: 'challengeCaption',
    href: '/discover/teams',
    icon: Swords,
    accent: '#A78BFA',
    bg: 'rgba(139,92,246,0.10)',
    border: 'rgba(139,92,246,0.25)',
  },
  {
    i18nKeyTitle: 'tournamentsTitle',
    i18nKeyCaption: 'tournamentsCaption',
    href: '/tournaments',
    icon: Trophy,
    accent: '#FBBF24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.25)',
  },
  {
    i18nKeyTitle: 'venuesTitle',
    i18nKeyCaption: 'venuesCaption',
    href: '/venues',
    icon: MapPin,
    accent: '#22D3EE',
    bg: 'rgba(6,182,212,0.10)',
    border: 'rgba(6,182,212,0.25)',
  },
];

export function QuickActions() {
  const t = useTranslations('home.quickActions');
  const locale = useLocale();

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <p className="bx-eyebrow mb-4">{t('eyebrow')}</p>
      <div className="space-y-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={`/${locale}${a.href}`}
              className="group flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-4 hover:border-[var(--line-2)] hover:bg-[var(--bg-3)] transition-colors"
            >
              <span
                className="grid place-items-center w-12 h-12 rounded-xl border shrink-0"
                style={{ background: a.bg, border: `1px solid ${a.border}` }}
                aria-hidden
              >
                <Icon size={22} color={a.accent} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-medium text-[15px] text-white truncate">
                  {t(a.i18nKeyTitle)}
                </span>
                <span className="block text-[12px] text-[var(--t-3)] mt-0.5 truncate">
                  {t(a.i18nKeyCaption)}
                </span>
              </span>
              <span
                aria-hidden
                className="text-[var(--t-4)] text-lg group-hover:text-white transition-colors"
              >
                ›
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
