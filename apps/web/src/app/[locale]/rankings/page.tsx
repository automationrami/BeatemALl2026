import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Info } from 'lucide-react';
import {
  EmptyState,
  Notice,
  PageHead,
  PodiumCard,
  SeasonChip,
  SectionTitle,
  SegmentedTabs,
  StandingsTable,
  StatStrip,
  buttonClass,
  type StandingsRow,
} from '@beat-em-all/ui';
import { latestRankingSeason, loadTeamRankings, type TeamRankings } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';

/**
 * Rankings (FED-1 US-FED1.4): public team leaderboard per federation, per game, per season.
 * Defaults to KEC (Organization #1); `?org=` scopes to any federation, `?game=` to one game.
 */
type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ org?: string; game?: string; season?: string }>;
};

const TERMS = ['spring', 'summer', 'autumn', 'winter'] as const;
type Term = (typeof TERMS)[number];

export default async function RankingsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const orgSlug = sp.org ?? 'kec';
  const t = await getTranslations('rankings');
  const ar = locale === 'ar';

  let data: TeamRankings | null = null;
  let failed = false;
  try {
    const season = sp.season ?? (await latestRankingSeason(orgSlug));
    if (season)
      data = await loadTeamRankings({
        season,
        organizationSlug: orgSlug,
        gameSlug: sp.game ?? null,
      });
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <main className="bx-page">
        <EmptyState title={t('unavailableTitle')} body={t('unavailableBody')} />
      </main>
    );
  }

  const orgName = data?.organization?.name ?? orgSlug.toUpperCase();
  const [yearPart, termPart] = (data?.season ?? '').split('-');
  const term = (TERMS as readonly string[]).includes(termPart ?? '') ? (termPart as Term) : null;
  const seasonLabel = term
    ? t('seasonLabel', { term: t(`term.${term}`), year: yearPart ?? '' })
    : (data?.season ?? '');

  const me = await getCurrentUser().catch(() => null);
  const myTeamIds = new Set(me?.teamMemberships.map((m) => m.teamId) ?? []);
  const money = (n: number) =>
    ar ? `${n.toLocaleString('en-US')} د.ك` : `KWD ${n.toLocaleString('en-US')}`;
  const hrefFor = (game?: string) => {
    const q = new URLSearchParams();
    if (sp.org) q.set('org', sp.org);
    if (sp.season) q.set('season', sp.season);
    if (game) q.set('game', game);
    const qs = q.toString();
    return `/${locale}/rankings${qs ? `?${qs}` : ''}`;
  };

  const rows = data?.rows ?? [];
  const tableRows: StandingsRow[] = rows.map((r) => ({
    id: r.teamId,
    rank: r.rank,
    delta: r.delta,
    name: r.name,
    sub: [r.city, r.countryCode].filter(Boolean).join(' · '),
    crest: { tag: r.tag, color: r.accentColor },
    points: r.points,
    medals: r.medals,
    me: myTeamIds.has(r.teamId),
    href: `/${locale}/teams/${r.slug}`,
  }));
  const hasMe = tableRows.some((r) => r.me);

  const eyebrow = [orgName, seasonLabel];
  if (data?.lastEvent) eyebrow.push(t('updatedAfter', { event: data.lastEvent.name }));

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={eyebrow}
        title={t('title', { org: orgName })}
        description={t('description', { org: orgName })}
        aside={
          seasonLabel ? <SeasonChip label={t('selectSeason')} value={seasonLabel} /> : undefined
        }
      >
        {data && rows.length > 0 && (
          <StatStrip
            bordered
            items={[
              { label: t('stats.prizePool'), value: money(data.stats.prizePoolKwd), tone: 'gold' },
              { label: t('stats.tournaments'), value: data.stats.tournaments },
              { label: t('stats.teams'), value: data.stats.teams },
              { label: t('stats.points'), value: data.stats.pointsAwarded.toLocaleString('en-US') },
            ]}
          />
        )}
      </PageHead>

      {data && data.games.length > 1 && (
        <SegmentedTabs
          label={t('gamesLabel')}
          value={sp.game ?? 'all'}
          items={[
            { value: 'all', label: t('allGames'), href: hrefFor() },
            ...data.games.map((g) => ({ value: g.slug, label: g.name, href: hrefFor(g.slug) })),
          ]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody', { org: orgName })}
          action={
            <Link href={`/${locale}/tournaments`} className={buttonClass('gold', 'sm')}>
              {t('browseTournaments')}
            </Link>
          }
        />
      ) : (
        <>
          <div className="bx-podium-row">
            {rows.slice(0, 3).map((r) => (
              <PodiumCard
                key={r.teamId}
                place={r.rank as 1 | 2 | 3}
                name={r.name}
                crest={{ tag: r.tag, color: r.accentColor }}
                positionLabel={t('podium.position')}
                kicker={t('podium.kicker')}
                meta={t('podium.events', { count: r.tournaments })}
                stats={[
                  {
                    label: t('podium.medals'),
                    value: r.medals.gold + r.medals.silver + r.medals.bronze,
                  },
                  { label: t('podium.points'), value: r.points.toLocaleString('en-US') },
                ]}
                href={`/${locale}/teams/${r.slug}`}
              />
            ))}
          </div>

          <section aria-labelledby="standings">
            <SectionTitle id="standings" title={t('standings')} />
            <div className="bx-stack">
              <StandingsTable
                rows={tableRows}
                labels={{
                  caption: t('table.caption', { org: orgName, season: seasonLabel }),
                  rank: t('table.rank'),
                  delta: t('table.delta'),
                  team: t('table.team'),
                  points: t('table.points'),
                  medals: t('table.medals'),
                  prize: t('table.prize'),
                  eligible: t('table.eligible'),
                  more: t('table.more'),
                  deltaSr: (n) =>
                    n > 0
                      ? t('table.up', { n })
                      : n < 0
                        ? t('table.down', { n: Math.abs(n) })
                        : t('table.held'),
                }}
              />
              <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
                {t('formula', { org: orgName })}
              </Notice>
              {hasMe && <Notice>{t('yourTeam')}</Notice>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
