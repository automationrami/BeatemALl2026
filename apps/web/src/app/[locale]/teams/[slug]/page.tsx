import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Button, Pill, StatCard, TeamCrest, VsBlock, Wordmark } from '@beat-em-all/ui';
import { loadTeamBySlug } from '@beat-em-all/db/queries';
import { GAMES } from '@beat-em-all/mock-data';
import type { TeamMember, TeamRole } from '@beat-em-all/types';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { ChallengeButton } from '@/components/challenge/ChallengeButton';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function TeamPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // DB-backed team profile (Phase 1 hybrid: real identity + members + games from
  // Postgres, mock-data overlay for stats / upcomingMatch / mock-only roster members).
  const team = await loadTeamBySlug(slug);
  if (!team) notFound();

  const t = await getTranslations('team');

  const ratingDeltaSign = team.stats.ratingDelta30d >= 0 ? '+' : '';
  const ratingDeltaText = t('ratingDelta', {
    delta: `${ratingDeltaSign}${team.stats.ratingDelta30d}`,
  });

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-10">
        <Link href={`/${locale}`} className="block">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-2 mb-5">
        {team.recruiting && (
          <Button tone="soft" size="sm">
            {t('applyToJoin')}
          </Button>
        )}
        <ChallengeButton
          targetTeamSlug={team.slug}
          targetTeamName={team.name}
          targetTeamGames={team.games}
          gameLabels={Object.fromEntries(team.games.map((g) => [g, GAMES[g]?.shortName ?? g]))}
        />
      </div>

      {/* Hero card */}
      <section className="bx-card p-7 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-7 items-center">
          <TeamCrest tag={team.tag} color={team.accentColor} size={120} />
          <div>
            <p className="bx-eyebrow mb-2">
              {t('eyebrow')} · {team.games.map((g) => GAMES[g].shortName).join(' / ')} ·{' '}
              {team.country}
            </p>
            <h1 className="font-display font-medium text-[44px] md:text-[56px] leading-[0.95] tracking-[-0.035em] mb-2">
              {team.name}
            </h1>
            <p className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.04em]">
              {team.tag} · {team.city} · {t('membersCount', { count: team.members.length })}
              {team.recruiting ? ` · ${t('recruiting')}` : ''}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {team.badges.map((b) => (
                <Pill key={b.label} tone={b.tone} dot={b.label === 'Verified'}>
                  {b.label}
                </Pill>
              ))}
            </div>
          </div>
          <div className="md:text-end text-start">
            <p className="bx-num text-[64px]">{team.stats.rating.toLocaleString()}</p>
            <p className="bx-eyebrow mt-1">
              {t('ratingLabel')} · {ratingDeltaText}
            </p>
          </div>
        </div>
      </section>

      {/* Stat row */}
      <section className="grid grid-cols-3 gap-3.5 mb-4">
        <StatCard label={t('winRate')} value={`${team.stats.winRate}%`} />
        <StatCard label={t('matches')} value={team.stats.totalMatches.toString()} />
        <StatCard label={t('trophies')} value={team.stats.trophies.toString()} />
      </section>

      {/* Roster + Upcoming */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
          <header className="mb-3 flex items-baseline justify-between">
            <p className="bx-eyebrow">{t('roster')}</p>
            <p className="bx-eyebrow text-[var(--t-3)]">
              {t('rosterCount', { count: team.members.length })}
            </p>
          </header>
          <div>
            {team.members.map((m, i) => (
              <RosterRow
                key={m.playerSlug}
                member={m}
                locale={locale}
                isLast={i === team.members.length - 1}
              />
            ))}
          </div>
        </div>

        <UpcomingCard
          team={team.upcomingMatch}
          self={{
            tag: team.tag,
            name: team.name,
            country: team.country,
            accentColor: team.accentColor,
          }}
          translations={{
            upcoming: t('upcoming'),
            noUpcomingMatch: t('noUpcomingMatch'),
          }}
        />
      </section>
    </main>
  );
}

function RosterRow({
  member,
  locale,
  isLast,
}: {
  member: TeamMember;
  locale: string;
  isLast: boolean;
}) {
  const roleLabelMap: Record<TeamRole, string> = {
    captain: 'CAPTAIN',
    co_captain: 'CO-CAPTAIN',
    starter: 'STARTER',
    sub: 'SUB',
    coach: 'COACH',
  };
  return (
    <Link
      href={`/${locale}/players/${member.playerSlug}`}
      className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center py-3 hover:bg-[rgba(255,255,255,0.02)] -mx-2 px-2 rounded-md transition-colors ${
        isLast ? '' : 'border-b border-[rgba(255,255,255,0.04)]'
      }`}
    >
      <Avatar name={member.displayName} size={36} color={member.avatarColor} />
      <div>
        <p className="font-display font-medium text-[14px] text-white">{member.displayName}</p>
        <p className="font-mono font-medium text-[10px] text-[var(--t-4)] tracking-[0.12em] uppercase mt-0.5">
          {member.inGameRole} · {roleLabelMap[member.role]}
        </p>
      </div>
      <span className="bx-num text-[18px]">{member.rating}</span>
      <span aria-hidden className="text-[var(--t-4)] text-lg">
        ›
      </span>
    </Link>
  );
}

function UpcomingCard({
  team: upcoming,
  self,
  translations,
}: {
  team: import('@beat-em-all/types').UpcomingMatch | null;
  self: { tag: string; name: string; country: string; accentColor: string };
  translations: { upcoming: string; noUpcomingMatch: string };
}) {
  if (!upcoming) {
    return (
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-6">
        <p className="bx-eyebrow mb-3">{translations.upcoming}</p>
        <p className="font-display text-[13px] text-[var(--t-3)]">{translations.noUpcomingMatch}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[20px] p-6"
      style={{
        background:
          'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(6,182,212,0.06) 45%, rgba(251,113,133,0.10) 100%), linear-gradient(180deg, #16131F, #0F1015)',
        border: '1px solid rgba(167,139,250,0.18)',
        boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 30px 80px -30px rgba(139,92,246,0.45)',
      }}
    >
      <p className="bx-eyebrow mb-2">
        {translations.upcoming} · {upcoming.startsInLabel}
      </p>
      <p className="font-display font-medium text-[14px] text-[var(--t-2)] mb-4">
        {upcoming.contextLabel}
      </p>
      <VsBlock
        teamA={self}
        teamB={upcoming.opponent}
        status={upcoming.statusPill ? <Pill tone="amber">{upcoming.statusPill}</Pill> : undefined}
      />
      <p className="mt-5 px-3.5 py-3 rounded-xl bg-black/25 font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">
        {upcoming.venueLabel}
      </p>
    </div>
  );
}
