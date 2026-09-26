'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  MapPin,
  Navigation,
  UserRoundCog,
  UsersRound,
} from 'lucide-react';
import { MatchCard, Tag, TeamCrest, buttonClass } from '@beat-em-all/ui';
import type { HomeHeroVariant } from '@beat-em-all/types';

type Props = { hero: HomeHeroVariant };

/** Seed labels may carry a leading pin emoji; the UI draws a Lucide pin instead. */
function stripPictograph(label: string): string {
  return label.replace(/^[\p{Extended_Pictographic}️\s]+/u, '');
}

type ShellProps = {
  eyebrow: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The Home hero surface: the black band with a faint gold wash — WinnerHero's stage,
 * calmer. Always dark, so text uses the on-band tokens.
 */
function HeroShell({ eyebrow, meta, children }: ShellProps) {
  return (
    <section className="bx-card grid gap-6 bg-band bg-[linear-gradient(120deg,var(--gold-soft),transparent_55%)] p-6 text-on-band md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Tag tone="outline">{eyebrow}</Tag>
        {meta}
      </div>
      {children}
    </section>
  );
}

type PromptProps = {
  eyebrow: string;
  title: string;
  body?: string;
  icon: React.ReactNode;
  actions: React.ReactNode;
};

/** Hero variant for the "nothing scheduled" states: title, one line, actions, icon art. */
function PromptHero({ eyebrow, title, body, icon, actions }: PromptProps) {
  return (
    <HeroShell eyebrow={eyebrow}>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-3">
          <h2 className="bx-display m-0 max-w-[20ch] text-on-band">{title}</h2>
          {body ? (
            <p className="m-0 max-w-[56ch] font-display text-[16px] leading-[22px] text-on-band-muted">
              {body}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3">{actions}</div>
        </div>
        <span
          aria-hidden
          className="hidden size-40 place-items-center rounded-2xl bg-gold-soft text-gold-text md:grid"
        >
          {icon}
        </span>
      </div>
    </HeroShell>
  );
}

const ART = 'bx-icon size-20 stroke-[1.25]';

export function HomeHero({ hero }: Props) {
  const t = useTranslations('home.hero');
  const tTour = useTranslations('home.tournaments');
  const locale = useLocale();
  const href = (path: string) => `/${locale}${path}`;
  const arrow = <ArrowRight className="bx-icon bx-flip" aria-hidden />;

  if (hero.kind === 'next_match') {
    const team = hero.team;
    const upcoming = team.upcomingMatch;
    if (!upcoming) return null; // typeguard, defensive
    const venue = stripPictograph(upcoming.venueLabel);
    return (
      <HeroShell
        eyebrow={t('nextMatchEyebrow')}
        meta={<span className="bx-label ms-auto text-gold-text">{upcoming.startsInLabel}</span>}
      >
        <MatchCard
          home={{
            name: team.name,
            sub: team.city,
            crest: { tag: team.tag, color: team.accentColor },
          }}
          away={{
            name: upcoming.opponent.name,
            sub: upcoming.opponent.country,
            crest: { tag: upcoming.opponent.tag, color: upcoming.opponent.accentColor },
          }}
          game={upcoming.contextLabel}
          round={upcoming.statusPill}
          venue={
            <span className="inline-flex items-center gap-1">
              <MapPin className="bx-icon size-3" aria-hidden />
              {venue}
            </span>
          }
          vsLabel={t('vs')}
        />
        <div className="flex flex-wrap gap-3">
          <Link href={href(`/teams/${team.slug}`)} className={buttonClass('gold')}>
            {t('viewMatch')}
            {arrow}
          </Link>
          <Link href={href(`/teams/${team.slug}`)} className={buttonClass('ink')}>
            <Navigation className="bx-icon" aria-hidden />
            {t('openDirections')}
          </Link>
        </div>
      </HeroShell>
    );
  }

  if (hero.kind === 'upcoming_tournament') {
    const tour = hero.tournament;
    return (
      <HeroShell
        eyebrow={t('tournamentEyebrow')}
        meta={<span className="bx-label ms-auto text-gold-text">{tour.startsInLabel}</span>}
      >
        <div className="flex items-center gap-5">
          <TeamCrest tag={tour.name.slice(0, 3)} color={tour.organizerAccent} size={72} />
          <div className="grid min-w-0 gap-2">
            <h2 className="m-0 truncate font-display text-[30px] font-bold leading-[32px] text-on-band">
              {tour.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[14px] font-medium text-on-band-muted">
                {tour.organizer}
              </span>
              {tour.isSanctioned ? <Tag tone="soft">{tTour('sanctioned')}</Tag> : null}
            </div>
          </div>
        </div>
        <div>
          <Link href={href(`/tournaments/${tour.slug}`)} className={buttonClass('gold')}>
            {t('openTournament')}
            {arrow}
          </Link>
        </div>
      </HeroShell>
    );
  }

  if (hero.kind === 'solo_prompt') {
    return (
      <PromptHero
        eyebrow={t('soloEyebrow')}
        title={t('soloTitle')}
        icon={<UsersRound className={ART} />}
        actions={
          <>
            <Link href={href('/discover/teams')} className={buttonClass('gold')}>
              {t('soloPrimaryCta')}
              {arrow}
            </Link>
            <Link href={href('/tournaments')} className={buttonClass('ink')}>
              {t('soloSecondaryCta')}
            </Link>
          </>
        }
      />
    );
  }

  if (hero.kind === 'incomplete_prompt') {
    return (
      <PromptHero
        eyebrow={t('incompleteEyebrow')}
        title={t('incompleteTitle')}
        body={t('incompleteBody')}
        icon={<UserRoundCog className={ART} />}
        actions={
          <Link href={href('/onboarding')} className={buttonClass('gold')}>
            {t('incompleteCta')}
            {arrow}
          </Link>
        }
      />
    );
  }

  // hero.kind === 'idle'
  return (
    <PromptHero
      eyebrow={t('idleEyebrow')}
      title={t('idleTitle')}
      body={t('idleBody')}
      icon={<CalendarClock className={ART} />}
      actions={
        <>
          <Link href={href('/discover/teams')} className={buttonClass('gold')}>
            {t('soloPrimaryCta')}
            {arrow}
          </Link>
          <Link href={href('/tournaments')} className={buttonClass('ink')}>
            {t('soloSecondaryCta')}
          </Link>
        </>
      }
    />
  );
}
