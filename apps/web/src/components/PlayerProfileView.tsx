'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Award,
  BadgeCheck,
  Calendar,
  Gamepad2,
  Link2,
  Lock,
  MapPin,
  PencilLine,
  Share2,
  Swords,
  UserPlus,
} from 'lucide-react';
import {
  Avatar,
  Button,
  EmptyState,
  ProfileHeader,
  SectionTitle,
  StatPentagon,
  Tag,
  buttonClass,
  useHasMounted,
} from '@beat-em-all/ui';
import { useActAsPersona, getPlayerProfileForPersona } from '@beat-em-all/api-client';
import { GAMES } from '@beat-em-all/mock-data';
import type { PlayerProfile } from '@beat-em-all/types';
import { ProfileMatchRow } from './player/ProfileMatchRow';

const FALLBACK_PROFILE: PlayerProfile = getPlayerProfileForPersona('khaled');

/** Renders the player profile of whatever persona is currently active in the store (/me). */
export function PlayerProfileView() {
  const mounted = useHasMounted();
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const profile = mounted ? getPlayerProfileForPersona(activePersonaId) : FALLBACK_PROFILE;
  return <PlayerProfileViewFor profile={profile} isSelf />;
}

type ViewProps = {
  profile: PlayerProfile;
  /** Force the "own profile" actions (Edit profile). When omitted, derived from the active persona. */
  isSelf?: boolean;
};

/** Same body, but driven by an explicit profile prop — used by /players/[slug]. */
export function PlayerProfileViewFor({ profile, isSelf }: ViewProps) {
  const mounted = useHasMounted();
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const self = isSelf ?? (mounted && activePersonaId === profile.personaId);

  return (
    <>
      <Header profile={profile} self={self} />
      <div className="bx-two">
        <RecentMatches profile={profile} />
        <Pentagon profile={profile} />
      </div>
      <Games profile={profile} />
      <div className="bx-two">
        <Achievements profile={profile} />
        <LinkedAccounts profile={profile} />
      </div>
    </>
  );
}

/* ---------- Header ---------- */

function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    // Non-ISO codes (e.g. "KSA") fall back to the raw code.
    return code;
  }
}

function Header({ profile, self }: { profile: PlayerProfile; self: boolean }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { stats } = profile;
  const num = (n: number) => n.toLocaleString('en-US');
  const hasMatches = stats.totalMatches > 0;

  const tags = (
    <>
      {profile.civilIdVerified && (
        <Tag tone="gold" icon={<BadgeCheck className="bx-icon" aria-hidden />}>
          {t('civilIdVerified')}
        </Tag>
      )}
      <Tag tone="ink">
        {t('playerEyebrow')} · {profile.country}
      </Tag>
      {profile.badges
        // Verification is shown by the Civil ID tag above.
        .filter((b) => b.label !== 'Verified')
        .map((b) =>
          b.href ? (
            <Link key={b.label} href={`/${locale}${b.href}`} className="hover:brightness-125">
              <Tag tone="soft">
                <bdi>{b.label}</bdi>
              </Tag>
            </Link>
          ) : (
            <Tag key={b.label}>
              <bdi>{b.label}</bdi>
            </Tag>
          ),
        )}
    </>
  );

  const ids = Array.from(
    new Set([...profile.linkedAccounts.map((a) => a.externalId), profile.handle].filter(Boolean)),
  );
  const placeParts = [profile.city, countryName(profile.country, locale)].filter(Boolean);
  // Wrapped in <bdi>, not <span>: the meta row styles every descendant span as a flex
  // item with a gap, which would split "City, Country".
  const place = (
    <bdi>
      {placeParts.map((part, i) => (
        <bdi key={part}>
          {i > 0 && (locale === 'ar' ? '، ' : ', ')}
          {part}
        </bdi>
      ))}
    </bdi>
  );

  const meta = [
    { icon: <MapPin className="bx-icon" aria-hidden />, text: place },
    { icon: <Gamepad2 className="bx-icon" aria-hidden />, text: <bdi>{ids.join(' · ')}</bdi> },
    {
      icon: <Calendar className="bx-icon" aria-hidden />,
      text: `${t('joinedPrefix')} ${profile.joinedLabel}`,
    },
  ];

  const share = (
    <Button
      variant="ghost"
      className="bx-btn--icon"
      aria-label={t('shareProfile')}
      title={t('shareProfile')}
    >
      <Share2 className="bx-icon" aria-hidden />
    </Button>
  );

  const actions = self ? (
    <>
      <Link href={`/${locale}/me/edit`} className={buttonClass('ink')} data-testid="edit-profile">
        <PencilLine className="bx-icon" aria-hidden />
        {t('editProfile')}
      </Link>
      {share}
    </>
  ) : (
    <>
      <Button variant="gold">
        <Swords className="bx-icon" aria-hidden />
        {t('challengeCta')}
      </Button>
      <Button variant="ink">
        <UserPlus className="bx-icon" aria-hidden />
        {t('follow')}
      </Button>
      {share}
    </>
  );

  const streak = stats.currentStreak;
  const streakValue =
    streak.count > 0 ? (
      <span className={streak.streakType === 'W' ? 'text-positive' : 'text-negative'}>
        {streak.streakType === 'W'
          ? t('streakWinValue', { count: streak.count })
          : t('streakLossValue', { count: streak.count })}
      </span>
    ) : (
      '—'
    );
  const deltaSign = stats.ratingDelta30d >= 0 ? '+' : '';

  const statItems = [
    {
      label:
        stats.rating > 0 ? (
          <>
            {t('statRating')} ·{' '}
            {t('ratingDeltaThisMonth', { delta: `${deltaSign}${stats.ratingDelta30d}` })}
          </>
        ) : (
          t('statRating')
        ),
      value: stats.rating > 0 ? num(stats.rating) : '—',
      tone: 'gold' as const,
    },
    { label: t('statWinRate'), value: hasMatches ? `${stats.winRate90d}%` : '—' },
    {
      label: t('statPrize'),
      value: stats.prizeWonKWD > 0 ? t('prizeAmount', { amount: num(stats.prizeWonKWD) }) : '—',
      tone: 'gold' as const,
    },
    {
      label: hasMatches ? (
        <>
          {t('statMatches')} · {t('winsLossesSub', { wins: stats.wins, losses: stats.losses })}
        </>
      ) : (
        t('statMatches')
      ),
      value: num(stats.totalMatches),
    },
    { label: t('statStreak'), value: streakValue },
  ];

  return (
    <ProfileHeader
      mark={
        <Avatar
          name={profile.displayName}
          size={120}
          verified={profile.civilIdVerified}
          verifiedLabel={t('civilIdVerified')}
        />
      }
      name={profile.displayName}
      tags={tags}
      meta={meta}
      bio={profile.bio ? <span dir="auto">{profile.bio}</span> : undefined}
      actions={actions}
      stats={statItems}
    />
  );
}

/* ---------- Sections ---------- */

function RecentMatches({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const matches = profile.recentMatches;
  return (
    <section className="min-w-0">
      <SectionTitle
        title={t('recentMatchesTitle')}
        actions={
          matches.length > 0 ? (
            <span className="bx-eyebrow">{t('lastN', { n: matches.length })}</span>
          ) : undefined
        }
      />
      {matches.length === 0 ? (
        <EmptyState title={t('emptyMatches')} />
      ) : (
        <ul className="bx-card grid gap-1 p-3">
          {matches.map((m) => (
            <ProfileMatchRow
              key={m.id}
              date={m.relativeDate}
              opponentLabel={m.opponentLabel}
              scoreLabel={m.scoreLabel}
              result={m.result}
              resultLabel={t(
                m.result === 'W' ? 'resultWin' : m.result === 'L' ? 'resultLoss' : 'resultDraw',
              )}
              gameTag={GAMES[m.game].shortName}
              isTournament={m.isTournament}
              tournamentLabel={t('tournamentMatch')}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Pentagon({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const { pentagon } = profile;
  const hasPentagon = pentagon.sampleSize > 0;
  return (
    <section className="min-w-0">
      <SectionTitle title={t('pentagonTitle')} />
      {hasPentagon ? (
        <div className="bx-card grid justify-items-center gap-3 p-6">
          <Tag tone="ink">{GAMES[pentagon.game].title}</Tag>
          {/* The chart's axis labels are Latin abbreviations; keep its geometry left-to-right. */}
          <div dir="ltr">
            <StatPentagon
              axes={pentagon.axes}
              overall={pentagon.overallRating}
              caption={t('pentagonCaption', { sample: pentagon.sampleSize })}
              size={240}
            />
          </div>
        </div>
      ) : (
        <EmptyState title={t('noPentagon')} />
      )}
    </section>
  );
}

function Games({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  return (
    <section>
      <SectionTitle title={t('gamesTitle')} />
      {profile.games.length === 0 ? (
        <EmptyState title={t('noGames')} />
      ) : (
        <div className="bx-comptiles max-[520px]:grid-cols-2">
          {profile.games.map((id) => {
            const g = GAMES[id];
            return (
              <article key={id} className="bx-comptile">
                <div className="bx-comptile__top">
                  <Tag tone="ink">{g.shortName}</Tag>
                </div>
                <div className="bx-comptile__name">{g.title}</div>
                <div className="bx-comptile__sub">{g.publisher}</div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Achievements({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const unlockedCount = profile.achievements.filter((a) => a.unlocked).length;
  const total = profile.achievements.length;
  return (
    <section className="min-w-0">
      <SectionTitle
        title={t('achievementsTitle')}
        actions={
          total > 0 ? (
            <span className="bx-eyebrow">
              {t('unlockedOf', { unlocked: unlockedCount, total })}
            </span>
          ) : undefined
        }
      />
      {unlockedCount === 0 ? (
        <EmptyState title={t('emptyAchievements')} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.achievements.slice(0, 12).map((a) => (
            <li
              key={a.id}
              className={[
                'bx-card bx-card--flat flex min-w-0 items-center gap-2.5 px-3 py-3',
                a.unlocked ? '' : 'opacity-50',
              ].join(' ')}
            >
              {a.unlocked ? (
                <Award className="bx-icon shrink-0 text-gold-text" aria-hidden />
              ) : (
                <Lock
                  className="bx-icon shrink-0 text-ink-muted"
                  aria-label={t('achievementLocked')}
                />
              )}
              <span
                className={[
                  'min-w-0 truncate font-display text-[13px] font-bold',
                  a.unlocked ? 'text-ink' : 'text-ink-muted',
                ].join(' ')}
                title={a.name}
                dir="auto"
              >
                {a.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinkedAccounts({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  return (
    <section className="min-w-0">
      <SectionTitle title={t('linkedAccountsTitle')} />
      {profile.linkedAccounts.length === 0 ? (
        <EmptyState title={t('noLinkedAccounts')} />
      ) : (
        <ul className="flex flex-wrap gap-3">
          {profile.linkedAccounts.map((a) => (
            <li
              key={a.provider}
              className="flex min-w-0 max-w-full items-center gap-3 rounded-tile bg-band px-4 py-3 text-on-band"
            >
              <Link2 className="bx-icon shrink-0 text-gold-text" aria-hidden />
              <div className="grid min-w-0 gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Tag tone="soft">{a.provider}</Tag>
                  <b className="truncate font-display text-[15px]" dir="ltr">
                    {a.externalId}
                  </b>
                </div>
                {(a.rankLabel || a.lastSync) && (
                  <span className="truncate font-display text-[12px] text-on-band-muted">
                    {[a.rankLabel, a.lastSync ? t('lastSynced', { when: a.lastSync }) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
