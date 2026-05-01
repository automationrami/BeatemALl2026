'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Pill, TeamCrest, VsBlock } from '@beat-em-all/ui';
import type { HomeHeroVariant } from '@beat-em-all/types';

type Props = { hero: HomeHeroVariant };

const HERO_GRADIENT = {
  background:
    'radial-gradient(120% 80% at 100% 0%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(120% 80% at 0% 100%, rgba(251,113,133,0.14), transparent 55%), linear-gradient(180deg,#16131F,#0F1015)',
  border: '1px solid rgba(167,139,250,0.18)',
  boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 30px 80px -30px rgba(139,92,246,0.45)',
};

export function HomeHero({ hero }: Props) {
  const t = useTranslations('home.hero');
  const locale = useLocale();
  const router = useRouter();
  const goto = (path: string) => router.push(`/${locale}${path}`);

  if (hero.kind === 'next_match') {
    const team = hero.team;
    const upcoming = team.upcomingMatch;
    if (!upcoming) return null; // typeguard, defensive
    return (
      <div className="rounded-[20px] p-6 md:p-7" style={HERO_GRADIENT}>
        <p className="bx-eyebrow mb-2">
          {t('nextMatchEyebrow')} · {upcoming.startsInLabel}
        </p>
        <p className="font-display font-medium text-[14px] text-[var(--t-2)] mb-4">
          {upcoming.contextLabel}
        </p>

        <VsBlock
          teamA={{
            tag: team.tag,
            name: team.name,
            country: team.country,
            accentColor: team.accentColor,
          }}
          teamB={upcoming.opponent}
          status={upcoming.statusPill ? <Pill tone="amber">{upcoming.statusPill}</Pill> : undefined}
        />

        <p className="mt-5 px-3.5 py-3 rounded-xl bg-black/25 font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">
          {upcoming.venueLabel}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button tone="primary" size="md" onClick={() => goto(`/teams/${team.slug}`)}>
            {t('viewMatch')} →
          </Button>
          <Button tone="ghost" size="md" onClick={() => goto(`/teams/${team.slug}`)}>
            {t('openDirections')}
          </Button>
        </div>
      </div>
    );
  }

  if (hero.kind === 'upcoming_tournament') {
    const tour = hero.tournament;
    return (
      <div className="rounded-[20px] p-6 md:p-7" style={HERO_GRADIENT}>
        <p className="bx-eyebrow mb-2">
          {t('tournamentEyebrow')} · {tour.startsInLabel}
        </p>
        <div className="flex items-start gap-4">
          <TeamCrest tag={tour.name.slice(0, 3)} color={tour.organizerAccent} size={88} />
          <div className="min-w-0">
            <h2 className="font-display font-medium text-[24px] md:text-[28px] tracking-[-0.025em] mb-1 truncate">
              {tour.name}
            </h2>
            <p className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.04em]">
              {tour.organizer}
              {tour.isSanctioned ? ' · ★ Sanctioned' : ''}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <Button tone="primary" size="md" onClick={() => goto(`/tournaments/${tour.slug}`)}>
            {t('openTournament')} →
          </Button>
        </div>
      </div>
    );
  }

  if (hero.kind === 'solo_prompt') {
    return (
      <div className="rounded-[20px] p-6 md:p-7" style={HERO_GRADIENT}>
        <p className="bx-eyebrow mb-3">{t('soloEyebrow')}</p>
        <h2 className="font-display font-medium text-[28px] md:text-[36px] tracking-[-0.02em] mb-5 max-w-xl leading-tight">
          {t('soloTitle')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button tone="primary" size="md" onClick={() => goto('/discover/teams')}>
            {t('soloPrimaryCta')} →
          </Button>
          <Button tone="ghost" size="md" onClick={() => goto('/discover/tournaments')}>
            {t('soloSecondaryCta')}
          </Button>
        </div>
      </div>
    );
  }

  if (hero.kind === 'incomplete_prompt') {
    return (
      <div className="rounded-[20px] p-6 md:p-7" style={HERO_GRADIENT}>
        <p className="bx-eyebrow mb-3">{t('incompleteEyebrow')}</p>
        <h2 className="font-display font-medium text-[28px] md:text-[36px] tracking-[-0.02em] mb-3 max-w-xl leading-tight">
          {t('incompleteTitle')}
        </h2>
        <p className="text-[var(--t-3)] max-w-xl text-base leading-relaxed mb-5">
          {t('incompleteBody')}
        </p>
        <Button tone="primary" size="md" onClick={() => goto('/onboarding')}>
          {t('incompleteCta')} →
        </Button>
      </div>
    );
  }

  // hero.kind === 'idle'
  return (
    <div className="rounded-[20px] p-6 md:p-7" style={HERO_GRADIENT}>
      <p className="bx-eyebrow mb-3">{t('idleEyebrow')}</p>
      <h2 className="font-display font-medium text-[28px] md:text-[36px] tracking-[-0.02em] mb-3 max-w-xl leading-tight">
        {t('idleTitle')}
      </h2>
      <p className="text-[var(--t-3)] max-w-xl text-base leading-relaxed mb-5">{t('idleBody')}</p>
      <div className="flex flex-wrap gap-3">
        <Button tone="primary" size="md" onClick={() => goto('/discover/teams')}>
          {t('soloPrimaryCta')} →
        </Button>
        <Button tone="ghost" size="md" onClick={() => goto('/discover/tournaments')}>
          {t('soloSecondaryCta')}
        </Button>
      </div>
    </div>
  );
}
