import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Flag, Info } from 'lucide-react';
import {
  EmptyState,
  Notice,
  PageHead,
  SectionTitle,
  StatStrip,
  Tag,
  buttonClass,
} from '@beat-em-all/ui';
import {
  TournamentAdminError,
  listTournamentGames,
  loadTournamentConsole,
  type ManagedTournamentConsole,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { BracketBoard } from '@/components/tournament/BracketBoard';
import { FinalStandings } from '@/components/tournament/FinalStandings';
import { formatAmount, teamCrestColor } from '@/components/tournament/display';
import { EntriesTable, type EntryRow } from '@/components/tournament-admin/EntriesTable';
import { MatchResultForm } from '@/components/tournament-admin/MatchResultForm';
import {
  TournamentActions,
  type TournamentActionName,
} from '@/components/tournament-admin/TournamentActions';
import { TournamentForm } from '@/components/tournament-admin/TournamentForm';
import { formatKuwaitDateTime } from '@/components/tournament-admin/time';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };
type Status = ManagedTournamentConsole['tournament']['status'];

const ACTIONS: Record<Status, TournamentActionName[]> = {
  draft: ['open_registration', 'cancel'],
  published: ['open_registration', 'cancel'],
  registration_open: ['close_registration', 'start', 'cancel'],
  registration_closed: ['open_registration', 'start', 'cancel'],
  in_progress: ['complete', 'cancel'],
  completed: [],
  cancelled: [],
};
const EDITABLE: Status[] = ['draft', 'published', 'registration_open'];
const ENTRIES_EDITABLE: Status[] = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
];

/** Organiser console (M-03…M-09): lifecycle, details, entries, bracket + results, standings. */
export default async function ManageTournamentPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('tournamentAdmin');

  const me = await getCurrentUser();
  let data: ManagedTournamentConsole;
  try {
    data = await loadTournamentConsole(slug, me.userId);
  } catch (err) {
    if (err instanceof TournamentAdminError && err.code === 'not_found') notFound();
    if (err instanceof TournamentAdminError && err.code === 'forbidden') {
      return (
        <main className="bx-page">
          <EmptyState title={t('forbiddenTitle')} body={t('forbiddenBody')} />
        </main>
      );
    }
    throw err;
  }

  const { tournament: tour, organization, game, entries, bracket, readyToComplete } = data;
  const games = EDITABLE.includes(tour.status) ? await listTournamentGames() : [];
  const money = (n: number) => t('money', { amount: formatAmount(n) });

  const active = entries.filter((e) =>
    ['pending_payment', 'confirmed', 'checked_in'].includes(e.status),
  );
  const checkedIn = entries.filter((e) => e.status === 'checked_in').length;

  const rows: EntryRow[] = entries.map((e) => ({
    id: e.id,
    status: e.status,
    seedNumber: e.seedNumber,
    checkedInAt: e.checkedInAt ? e.checkedInAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    createdLabel: formatKuwaitDateTime(e.createdAt, locale),
    disqualificationReason: e.disqualificationReason,
    finalPlacement: e.finalPlacement,
    team: e.team,
    crestColor: teamCrestColor(e.team.slug),
    registeredBy: e.registeredBy,
    paidKwd: e.paidKwd,
  }));

  // Result forms: playable matches, and decided ones that can still be corrected.
  const extras: Record<string, React.ReactNode> = {};
  if (bracket && tour.status === 'in_progress') {
    for (const round of bracket.rounds) {
      for (const m of round.matches) {
        if (!m.matchId || !m.home.team || !m.away.team || m.isBye) continue;
        if (!m.playable && (m.locked || !m.winnerTeamId)) continue;
        extras[m.matchId] = (
          <MatchResultForm
            matchId={m.matchId}
            homeName={m.home.team.name}
            awayName={m.away.team.name}
            current={
              m.winnerTeamId && m.home.score !== null && m.away.score !== null
                ? { home: m.home.score, away: m.away.score }
                : null
            }
          />
        );
      }
    }
  }

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/manage`}
          className="bx-label inline-flex items-center gap-2 justify-self-start text-ink-muted no-underline hover:text-ink"
        >
          <ArrowLeft className="bx-icon bx-flip" aria-hidden />
          {t('backToManage')}
        </Link>

        <PageHead
          eyebrow={[organization.name, game.name, t('formatSingleElim')]}
          title={tour.name}
          description={
            tour.startsAt
              ? t('startsOn', { date: formatKuwaitDateTime(tour.startsAt, locale) })
              : undefined
          }
          aside={
            <div className="grid justify-items-end gap-2">
              <Tag
                tone={
                  tour.status === 'in_progress'
                    ? 'live'
                    : tour.status === 'registration_open'
                      ? 'soft'
                      : 'outline'
                }
              >
                <span data-testid="tournament-status" data-status={tour.status}>
                  {t(`status.${tour.status}`)}
                </span>
              </Tag>
              {tour.status !== 'draft' ? (
                <Link
                  href={`/${locale}/tournaments/${tour.slug}`}
                  className={buttonClass('ghost', 'sm')}
                  data-testid="tournament-public-link"
                >
                  <ExternalLink className="bx-icon" aria-hidden />
                  {t('viewPublic')}
                </Link>
              ) : null}
            </div>
          }
        >
          <StatStrip
            items={[
              { label: t('statEntries'), value: active.length, of: tour.maxTeams, tone: 'gold' },
              { label: t('statCheckedIn'), value: checkedIn },
              {
                label: t('statEntryFee'),
                value: tour.entryFeeKwd > 0 ? money(tour.entryFeeKwd) : t('free'),
              },
              { label: t('statPrizePool'), value: money(tour.prizePoolKwd) },
            ]}
          />
        </PageHead>
      </div>

      <section className="grid gap-4" aria-labelledby="lifecycle-title">
        <SectionTitle id="lifecycle-title" title={t('lifecycleTitle')} />
        {tour.status === 'draft' ? (
          <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
            {t('draftNotice')}
          </Notice>
        ) : null}
        {readyToComplete ? (
          <div data-testid="ready-to-complete">
            <Notice icon={<Flag className="bx-icon" aria-hidden />}>{t('readyToComplete')}</Notice>
          </div>
        ) : null}
        {tour.status === 'registration_open' || tour.status === 'registration_closed' ? (
          <p className="m-0 text-[13px] text-ink-muted">{t('startHint')}</p>
        ) : null}
        <TournamentActions
          slug={tour.slug}
          actions={ACTIONS[tour.status]}
          disabled={tour.status === 'in_progress' && !readyToComplete ? ['complete'] : []}
        />
      </section>

      {bracket ? (
        <section className="grid gap-4" aria-labelledby="bracket-title">
          <SectionTitle
            id="bracket-title"
            title={t('bracketTitle')}
            eyebrow={tour.status === 'in_progress' ? t('bracketHint') : undefined}
          />
          <BracketBoard bracket={bracket} extras={extras} />
        </section>
      ) : null}

      {bracket?.finalDecided ? (
        <section className="grid gap-4" aria-labelledby="standings-title">
          <SectionTitle id="standings-title" title={t('standingsTitle')} />
          <FinalStandings standings={bracket.standings} locale={locale} />
        </section>
      ) : null}

      <section className="grid gap-4" aria-labelledby="entries-title">
        <SectionTitle
          id="entries-title"
          title={t('entriesTitle')}
          eyebrow={t('entriesCount', { count: active.length, max: tour.maxTeams })}
        />
        {rows.length === 0 ? (
          <EmptyState title={t('entriesEmpty')} />
        ) : (
          <EntriesTable
            entries={rows}
            entryFeeKwd={tour.entryFeeKwd}
            editable={ENTRIES_EDITABLE.includes(tour.status)}
            locale={locale}
          />
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="details-title">
        <SectionTitle id="details-title" title={t('detailsTitle')} />
        {EDITABLE.includes(tour.status) ? (
          <TournamentForm
            mode="edit"
            slug={tour.slug}
            isFederation={organization.tier === 'federation'}
            games={games}
            entriesExist={active.length > 0}
            initial={{
              name: tour.name,
              gameSlug: game.slug,
              matchFormat:
                (['bo1', 'bo3', 'bo5'] as const).find((f) => f === tour.matchFormat) ?? 'bo3',
              teamSize: tour.teamSize,
              maxTeams: tour.maxTeams,
              minTeams: tour.minTeams,
              entryFeeKwd: tour.entryFeeKwd,
              prizePoolKwd: tour.prizePoolKwd,
              startsAt: tour.startsAt ? tour.startsAt.toISOString() : null,
              registrationClosesAt: tour.registrationClosesAt
                ? tour.registrationClosesAt.toISOString()
                : null,
              description: tour.description,
              rulesUrl: tour.rulesUrl,
              isOfficialSanctioned: tour.isOfficialSanctioned,
              awardsRankingPoints: tour.awardsRankingPoints,
              seedingStrategy: tour.seedingStrategy === 'random' ? 'random' : 'check_in',
            }}
          />
        ) : (
          <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
            {t('detailsLocked')}
          </Notice>
        )}
      </section>
    </main>
  );
}
