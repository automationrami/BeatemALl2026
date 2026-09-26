'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Building2,
  CalendarCheck,
  CircleUser,
  House,
  ListOrdered,
  Swords,
  Ticket,
  TicketPercent,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Wordmark } from '@beat-em-all/ui';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';

type NavKey =
  | 'home'
  | 'tournaments'
  | 'rankings'
  | 'challenges'
  | 'venues'
  | 'bookings'
  | 'entries'
  | 'vouchers'
  | 'profile';
type NavItem = { key: NavKey; href: string; icon: LucideIcon; match: RegExp };

const ITEMS: NavItem[] = [
  { key: 'home', href: '', icon: House, match: /^\/?$/ },
  { key: 'tournaments', href: '/tournaments', icon: Trophy, match: /^\/tournaments/ },
  { key: 'rankings', href: '/rankings', icon: ListOrdered, match: /^\/rankings/ },
  { key: 'challenges', href: '/challenges', icon: Swords, match: /^\/challenges/ },
  { key: 'venues', href: '/venues', icon: Building2, match: /^\/venues/ },
  { key: 'bookings', href: '/bookings', icon: CalendarCheck, match: /^\/bookings/ },
  { key: 'entries', href: '/registrations', icon: Ticket, match: /^\/registrations/ },
  { key: 'vouchers', href: '/vouchers', icon: TicketPercent, match: /^\/vouchers/ },
];
const PROFILE: NavItem = {
  key: 'profile',
  href: '/me',
  icon: CircleUser,
  match: /^\/(me|players)/,
};
const TABS: NavKey[] = ['home', 'tournaments', 'rankings', 'challenges', 'profile'];

/** Routes that render full-screen, without navigation (auth and onboarding flows). */
const BARE = /^\/(sign-in|verify|onboarding|auth)(\/|$)/;

/**
 * The app frame: a 96px side rail on desktop, five bottom tabs on phones, and a slim
 * top bar holding the language toggle and the Phase-1 persona switcher. Pages render
 * their own <main className="bx-page"> inside it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname() ?? '/';
  const local = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';

  if (BARE.test(local)) return <>{children}</>;

  const href = (it: NavItem) => `/${locale}${it.href}`;
  const current = (it: NavItem) => it.match.test(local);

  return (
    <div className="bx-app">
      <a
        href="#content"
        className="bx-sr focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 bx-btn bx-btn--gold"
      >
        {t('skipToContent')}
      </a>
      <aside className="bx-app__rail">
        <nav className="bx-rail" aria-label={t('main')}>
          <Link href={`/${locale}`} className="bx-rail__logo" aria-label="Beat'Em All">
            <Wordmark size={28} showLabel={false} />
          </Link>
          <div className="bx-rail__nav">
            {ITEMS.map((it) => (
              <Link
                key={it.key}
                href={href(it)}
                className="bx-rail__item"
                aria-current={current(it) ? 'page' : undefined}
              >
                <it.icon className="bx-icon" aria-hidden />
                {t(it.key)}
              </Link>
            ))}
          </div>
          <div className="bx-rail__foot">
            <Link
              href={href(PROFILE)}
              className="bx-rail__item bx-rail__item--band"
              aria-current={current(PROFILE) ? 'page' : undefined}
            >
              <PROFILE.icon className="bx-icon" aria-hidden />
              {t('profile')}
            </Link>
          </div>
        </nav>
      </aside>

      <div className="bx-app__main">
        <header className="bx-topbar">
          <Link href={`/${locale}`} className="bx-topbar__brand">
            <Wordmark size={28} />
          </Link>
          <LanguageToggle />
          <PersonaSwitcher />
        </header>
        <div id="content">{children}</div>
      </div>

      <div className="bx-app__tabs">
        <nav className="bx-tabs" aria-label={t('main')}>
          {TABS.map((key) => {
            const it = key === 'profile' ? PROFILE : (ITEMS.find((i) => i.key === key) as NavItem);
            return (
              <Link key={key} href={href(it)} aria-current={current(it) ? 'page' : undefined}>
                <it.icon className="bx-icon" aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
