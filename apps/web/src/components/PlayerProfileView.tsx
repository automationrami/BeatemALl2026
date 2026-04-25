'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Avatar,
  Button,
  MatchRow,
  Pill,
  StatCard,
  StatPentagon,
  useHasMounted,
} from '@beat-em-all/ui';
import { useActAsPersona, getPlayerProfileForPersona } from '@beat-em-all/api-client';
import { GAMES } from '@beat-em-all/mock-data';
import type { PlayerProfile } from '@beat-em-all/types';

const FALLBACK_PROFILE: PlayerProfile = getPlayerProfileForPersona('khaled');

/** Renders the player profile of whatever persona is currently active in the store. */
export function PlayerProfileView() {
  const mounted = useHasMounted();
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const profile = mounted ? getPlayerProfileForPersona(activePersonaId) : FALLBACK_PROFILE;
  return <PlayerProfileViewFor profile={profile} />;
}

/** Same body, but driven by an explicit profile prop — used by /players/[slug]. */
export function PlayerProfileViewFor({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-end gap-2 mb-5">
        <Button tone="soft" size="sm">
          {t('follow')}
        </Button>
        <Button tone="primary" size="sm">
          {t('challengeCta')} →
        </Button>
      </div>

      {/* Hero card */}
      <HeroCard profile={profile} />

      {/* Stat quartet */}
      <StatQuartet profile={profile} />

      {/* Recent matches + achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <RecentMatchesCard profile={profile} />
        <AchievementsCard profile={profile} />
      </div>

      {/* Linked accounts */}
      <LinkedAccountsCard profile={profile} />
    </div>
  );
}

function HeroCard({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const hasPentagon = profile.pentagon.sampleSize > 0;

  return (
    <section className="bx-card p-7 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-7 items-center">
        <Avatar
          name={profile.displayName}
          size={120}
          color={profile.avatarColor}
          verified={profile.civilIdVerified}
        />
        <div>
          <p className="bx-eyebrow mb-2">
            {t('playerEyebrow')} · {profile.country}
          </p>
          <h1 className="font-display font-medium text-[40px] md:text-[44px] leading-[0.95] tracking-[-0.035em] mb-2">
            {profile.displayName}
          </h1>
          <p className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.04em]">
            {profile.handle} · {profile.city} · {t('joinedPrefix')} {profile.joinedLabel}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.badges.map((b) => {
              const pill = (
                <Pill tone={b.tone} dot={b.label === 'Verified'}>
                  {b.label}
                </Pill>
              );
              return b.href ? (
                <Link
                  key={b.label}
                  href={`/${locale}${b.href}`}
                  className="hover:brightness-125 transition"
                >
                  {pill}
                </Link>
              ) : (
                <span key={b.label}>{pill}</span>
              );
            })}
          </div>
        </div>
        <div className="md:flex hidden justify-center">
          {hasPentagon ? (
            <StatPentagon
              axes={profile.pentagon.axes}
              overall={profile.pentagon.overallRating}
              caption={t('pentagonCaption', { sample: profile.pentagon.sampleSize })}
              size={220}
            />
          ) : (
            <div className="w-[220px] h-[220px] rounded-full border border-dashed border-[var(--line-2)] grid place-items-center text-center px-6">
              <p className="font-display text-[12px] text-[var(--t-3)] leading-[1.5]">
                {t('noPentagon')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatQuartet({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const { stats } = profile;
  const streakLabel = `${stats.currentStreak.streakType}${stats.currentStreak.count}`;
  const streakColor = stats.currentStreak.streakType === 'W' ? '#BEF264' : '#FB7185';
  const ratingDeltaSign = stats.ratingDelta30d >= 0 ? '+' : '';
  const ratingDeltaSub =
    stats.rating > 0
      ? t('ratingDeltaThisMonth', { delta: `${ratingDeltaSign}${stats.ratingDelta30d}` })
      : '—';

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
      <StatCard
        label={t('winRate')}
        value={stats.totalMatches > 0 ? `${stats.winRate90d}%` : '—'}
        sub={
          stats.totalMatches > 0
            ? t('winsLossesSub', { wins: stats.wins, losses: stats.losses })
            : undefined
        }
      />
      <StatCard
        label={t('rating')}
        value={stats.rating > 0 ? stats.rating.toLocaleString() : '—'}
        sub={ratingDeltaSub}
        subColor={stats.ratingDelta30d > 0 ? '#BEF264' : undefined}
      />
      <StatCard label={t('matches')} value={stats.totalMatches.toString()} />
      <StatCard
        label={t('streak')}
        value={stats.currentStreak.count > 0 ? streakLabel : '—'}
        valueColor={stats.currentStreak.count > 0 ? streakColor : undefined}
        sub={
          stats.currentStreak.count > 0
            ? stats.currentStreak.streakType === 'W'
              ? t('streakWin')
              : t('streakLoss')
            : undefined
        }
      />
    </section>
  );
}

function RecentMatchesCard({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const matches = profile.recentMatches;
  return (
    <section className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="bx-eyebrow">{t('recentMatches')}</p>
        <p className="bx-eyebrow text-[var(--t-3)]">{t('lastN', { n: matches.length })}</p>
      </header>
      {matches.length === 0 ? (
        <EmptyHint>{t('emptyMatches')}</EmptyHint>
      ) : (
        <div>
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              date={m.relativeDate}
              opponentLabel={m.opponentLabel}
              scoreLabel={m.scoreLabel}
              result={m.result}
              gameTag={GAMES[m.game].shortName}
              isTournament={m.isTournament}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AchievementsCard({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const unlockedCount = profile.achievements.filter((a) => a.unlocked).length;
  const total = profile.achievements.length;
  return (
    <section className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="bx-eyebrow">{t('achievements')}</p>
        <p className="bx-eyebrow text-[var(--t-3)]">
          {t('unlockedOf', { unlocked: unlockedCount, total })}
        </p>
      </header>
      {unlockedCount === 0 ? (
        <EmptyHint>{t('emptyAchievements')}</EmptyHint>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {profile.achievements.slice(0, 12).map((a) => (
            <div
              key={a.id}
              title={a.name}
              className="aspect-square rounded-[10px] grid place-items-center font-mono text-[22px] font-medium border"
              style={{
                background: a.unlocked
                  ? `linear-gradient(135deg, ${a.color}33, transparent)`
                  : 'rgba(255,255,255,0.03)',
                borderColor: a.unlocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                color: a.unlocked ? 'white' : 'var(--t-5)',
                opacity: a.unlocked ? 1 : 0.5,
              }}
            >
              {a.unlocked ? a.glyph : '·'}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LinkedAccountsCard({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  return (
    <section className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 mt-4">
      <p className="bx-eyebrow mb-3">{t('linkedAccounts')}</p>
      {profile.linkedAccounts.length === 0 ? (
        <EmptyHint>{t('noLinkedAccounts')}</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.linkedAccounts.map((a) => (
            <div
              key={a.provider}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--line-2)]"
            >
              <span
                className="w-8 h-8 rounded-lg grid place-items-center font-display font-bold text-[10px] text-white"
                style={{ background: providerColor(a.provider) }}
              >
                {a.provider.toUpperCase().slice(0, 4)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[13px] font-medium truncate">{a.externalId}</p>
                {a.rankLabel && (
                  <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.06em] mt-0.5">
                    {a.rankLabel}
                    {a.lastSync ? ` · ${a.lastSync}` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="font-display text-[13px] text-[var(--t-3)] py-2">{children}</p>;
}

function providerColor(p: string): string {
  switch (p) {
    case 'steam':
      return 'linear-gradient(135deg, #22D3EE, #06B6D4)';
    case 'riot':
      return 'linear-gradient(135deg, #FB7185, #E11D48)';
    case 'psn':
      return 'linear-gradient(135deg, #3B82F6, #1E40AF)';
    case 'xbox':
      return 'linear-gradient(135deg, #BEF264, #65A30D)';
    default:
      return 'linear-gradient(135deg, #A78BFA, #7C3AED)';
  }
}
