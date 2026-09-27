'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Award,
  BadgeCheck,
  Calendar,
  Link2,
  Lock,
  PencilLine,
  Share2,
  Swords,
  UserPlus,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  SectionTitle,
  StatPentagon,
  Tag,
  buttonClass,
  useHasMounted,
} from '@beat-em-all/ui';
import { useActAsPersona, getPlayerProfileForPersona } from '@beat-em-all/api-client';
import { GAMES, TEAMS_LIST } from '@beat-em-all/mock-data';
import type { MatchSummary, PlayerProfile } from '@beat-em-all/types';
import { PlayerCard } from './cards/PlayerCard';
import { PlayerStatsBanner } from './cards/PlayerStatsBanner';
import { ResultsCard, type ResultsCardGroup } from './cards/ResultsCard';
import { ProfileMatchRow } from './player/ProfileMatchRow';

const FALLBACK_PROFILE: PlayerProfile = getPlayerProfileForPersona('khaled');

/** Renders the player profile of whatever persona is currently active in the store (/me). */
export function PlayerProfileView() {
  const mounted = useHasMounted();
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const profile = mounted ? getPlayerProfileForPersona(activePersonaId) : FALLBACK_PROFILE;
  return <PlayerProfileViewFor profile={profile} isSelf />;
}

/** The player's main team (captaincy first), from the server; null for free agents. */
export type ProfileTeam = {
  slug: string;
  name: string;
  tag: string;
  color: string;
  role: 'captain' | 'co_captain' | 'starter' | 'substitute' | 'coach' | 'manager';
};

type ViewProps = {
  profile: PlayerProfile;
  /** Force the "own profile" actions (Edit profile). When omitted, derived from the active persona. */
  isSelf?: boolean;
  team?: ProfileTeam | null;
};

/** Same body, but driven by an explicit profile prop — used by /players/[slug]. */
export function PlayerProfileViewFor({ profile, isSelf, team }: ViewProps) {
  const mounted = useHasMounted();
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const self = isSelf ?? (mounted && activePersonaId === profile.personaId);

  return (
    <>
      <Header profile={profile} self={self} team={team ?? null} />
      <div className="bx-two">
        <RecentMatches profile={profile} />
        <PlayerCardSection profile={profile} team={team ?? null} />
      </div>
      <div className="bx-two">
        <Pentagon profile={profile} />
        <Achievements profile={profile} />
      </div>
      <Games profile={profile} />
      <LinkedAccounts profile={profile} />
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

/** Status pill on the gold banner: ink chip, never letter-spaced in Arabic. */
function BannerPill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-band px-3 py-1 text-xs/none font-extrabold tracking-[0.12em] text-gold-text-hi uppercase rtl:tracking-normal">
      {icon}
      {children}
    </span>
  );
}

function Header({
  profile,
  self,
  team,
}: {
  profile: PlayerProfile;
  self: boolean;
  team: ProfileTeam | null;
}) {
  const t = useTranslations('profile');
  const tc = useTranslations('cards');
  const tr = useTranslations('roster');
  const locale = useLocale();
  const { stats } = profile;
  const num = (n: number) => n.toLocaleString('en-US');
  const hasMatches = stats.totalMatches > 0;

  const tags = (
    <>
      <BannerPill>{team ? tr(`roles.${team.role}`) : tc('noTeamRole')}</BannerPill>
      {profile.civilIdVerified && (
        <BannerPill icon={<BadgeCheck className="size-3.5" aria-hidden />}>
          {t('civilIdVerified')}
        </BannerPill>
      )}
      {profile.badges
        // Verification is the Civil ID pill; the team shows beside its crest.
        .filter((b) => b.label !== 'Verified' && !b.href)
        .map((b) => (
          <BannerPill key={b.label}>
            <bdi>{b.label}</bdi>
          </BannerPill>
        ))}
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

  const facts = [
    { label: tc('fromLabel'), value: place },
    { label: tc('joinedLabel'), value: profile.joinedLabel },
    ...(ids.length > 0
      ? [{ label: tc('idsLabel'), value: <bdi dir="ltr">{ids.join(' · ')}</bdi> }]
      : []),
    ...(profile.games.length > 0
      ? [
          {
            label: tc('gamesLabel'),
            value: profile.games.map((g) => GAMES[g]?.shortName ?? g).join(' · '),
          },
        ]
      : []),
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
    <div className="grid gap-3">
      <PlayerStatsBanner
        name={profile.displayName}
        pills={tags}
        team={
          team
            ? {
                name: team.name,
                tag: team.tag,
                color: team.color,
                href: `/${locale}/teams/${team.slug}`,
              }
            : null
        }
        facts={facts}
        stats={statItems}
      />
      <div className="bx-card flex flex-wrap items-center justify-between gap-3 p-4">
        {profile.bio ? (
          <p
            className="m-0 min-w-0 max-w-[72ch] flex-1 text-[15px] leading-relaxed text-ink-muted"
            dir="auto"
          >
            {profile.bio}
          </p>
        ) : (
          <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-muted">
            <Calendar className="bx-icon" aria-hidden />
            {`${t('joinedPrefix')} ${profile.joinedLabel}`}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

const TEAM_BY_NAME = new Map(TEAMS_LIST.map((tm) => [tm.name.toLowerCase(), tm]));

function resultSide(label: string, score: number) {
  const name = label.trim();
  const known = TEAM_BY_NAME.get(name.toLowerCase());
  const tag =
    known?.tag ??
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  return { name, tag, color: known?.accentColor ?? '#987C4B', score };
}

/** "Sandstorm vs Falcon Squad" + "13–9" → a results-card row, or null when it doesn't parse. */
function toResultEvent(m: MatchSummary, note: string) {
  const [a, b] = m.opponentLabel.split(/\s+vs\s+/i);
  const [sa, sb] = m.scoreLabel.split(/[-–]/).map((n) => Number.parseInt(n, 10));
  if (!a || !b || sa === undefined || sb === undefined || Number.isNaN(sa) || Number.isNaN(sb))
    return null;
  return { id: m.id, home: resultSide(a, sa), away: resultSide(b, sb), note };
}

function RecentMatches({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations('profile');
  const tc = useTranslations('cards');
  const matches = profile.recentMatches;
  const rows = matches.map((m) => ({
    m,
    event: toResultEvent(m, `${GAMES[m.game]?.shortName ?? m.game} · ${m.relativeDate}`),
  }));
  const parsed = rows.every((r) => r.event !== null);
  const pick = (tournament: boolean) =>
    rows.flatMap((r) => (r.m.isTournament === tournament && r.event ? [r.event] : []));
  const groups: ResultsCardGroup[] = [
    { title: t('tournamentMatch'), events: pick(true) },
    { title: tc('challenges'), events: pick(false) },
  ].filter((g) => g.events.length > 0);
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
      ) : parsed ? (
        <ResultsCard groups={groups} />
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

function PlayerCardSection({
  profile,
  team,
}: {
  profile: PlayerProfile;
  team: ProfileTeam | null;
}) {
  const t = useTranslations('profile');
  const tc = useTranslations('cards');
  const tr = useTranslations('roster');
  const { stats } = profile;
  const num = (n: number) => n.toLocaleString('en-US');
  const primaryGame = profile.games[0];
  return (
    <section className="min-w-0">
      <SectionTitle title={tc('playerCardTitle')} />
      <PlayerCard
        name={profile.displayName}
        role={team ? `${tr(`roles.${team.role}`)} · ${team.name}` : tc('noTeamRole')}
        badge={team?.tag}
        team={team ? { tag: team.tag, color: team.color } : null}
        game={primaryGame ? (GAMES[primaryGame]?.shortName ?? primaryGame) : undefined}
        stats={[
          { label: t('statMatches'), value: num(stats.totalMatches) },
          { label: t('streakWin'), value: num(stats.wins) },
          { label: t('statRating'), value: stats.rating > 0 ? num(stats.rating) : '—' },
        ]}
      />
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
