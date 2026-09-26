import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Info, Settings2 } from 'lucide-react';
import { EmptyState, Notice, SectionTitle, Tag, TeamCrest } from '@beat-em-all/ui';
import {
  canManageOrganizationTournaments,
  listRegistrationsForTournament,
  loadBracketView,
  loadTournamentBySlug,
} from '@beat-em-all/db/queries';
import { BracketBoard } from '@/components/tournament/BracketBoard';
import { ButtonLink } from '@/components/tournament/ButtonLink';
import { FinalStandings } from '@/components/tournament/FinalStandings';
import { RegisterTeamButton } from '@/components/tournament/RegisterTeamButton';
import { TournamentHero } from '@/components/tournament/TournamentHero';
import {
  formatAmount,
  gameShort,
  gameTitle,
  registrationStatusKey,
  teamCrestColor,
  tournamentLifecycleKey,
  tournamentStatusTone,
} from '@/components/tournament/display';
import { formatKuwaitDateTime } from '@/components/tournament-admin/time';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default async function TournamentDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Tournament detail is public — gracefully degrade when the persona cookie is stale
  // or missing. We just lose the "Register" CTA + "your team" highlight, not the whole
  // page. Otherwise a stale cookie would 500 anonymous viewers reading the bracket.
  const me = await getCurrentUser().catch(() => null);

  // Drafts resolve only for members of the organising organisation (404 for everyone else).
  const tour = await loadTournamentBySlug(slug, { viewerUserId: me?.userId ?? null });
  if (!tour) notFound();

  const [registrations, bracket, canManage] = await Promise.all([
    listRegistrationsForTournament(slug),
    loadBracketView(tour.id),
    me ? canManageOrganizationTournaments(me.userId, tour.organizationId) : Promise.resolve(false),
  ]);
  const myTeamIds = new Set(me?.teamMemberships.map((m) => m.teamId) ?? []);
  const myRegistration = me ? registrations.find((r) => myTeamIds.has(r.team.id)) : undefined;

  const t = await getTranslations('tournament');
  const tReg = await getTranslations('registration');
  const tBracket = await getTranslations('bracket');

  const statusLabel = t(tournamentLifecycleKey(tour.lifecycle));
  const isOpen = tour.lifecycle === 'registration_open';

  const startsFact = tour.startsInLabel
    ? tour.startsInLabel
    : tour.startsAt
      ? t('startsOn', { date: formatKuwaitDateTime(tour.startsAt, locale) })
      : null;
  const registrationFact = tour.registrationLabel
    ? tour.registrationLabel
    : isOpen
      ? tour.registrationClosesAt
        ? t('closesOn', { date: formatKuwaitDateTime(tour.registrationClosesAt, locale) })
        : t('registrationOpen')
      : null;

  const facts = [
    // The seeded labels already read as sentences ("Starts in 12d"), so no key prefix.
    ...(startsFact ? [{ k: null, v: startsFact }] : []),
    ...(registrationFact ? [{ k: null, v: registrationFact }] : []),
    { k: t('registeredLabel'), v: tReg('registeredCount', { count: registrations.length }) },
    ...(tour.entryFeeKwd > 0
      ? [{ k: t('entryFeeLabel'), v: t('moneyKwd', { amount: formatAmount(tour.entryFeeKwd) }) }]
      : []),
    {
      k: t('formatLabel'),
      v: t('formatValue', { size: tour.teamSize, bo: tour.matchFormat.toUpperCase() }),
    },
  ];

  const showBracket = !!bracket && tour.lifecycle !== 'cancelled';

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/tournaments`}
          className="bx-label inline-flex items-center gap-2 justify-self-start text-ink-muted no-underline hover:text-ink"
        >
          <ArrowLeft className="bx-icon bx-flip" aria-hidden />
          {t('backToList')}
        </Link>

        {tour.lifecycle === 'draft' ? (
          <div data-testid="tournament-draft-notice">
            <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
              {t('draftNotice')}
            </Notice>
          </div>
        ) : null}
        {tour.lifecycle === 'cancelled' ? (
          <div data-testid="tournament-cancelled-notice">
            <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
              {t('cancelledNotice')}
            </Notice>
          </div>
        ) : null}

        <TournamentHero
          status={statusLabel}
          statusTone={tournamentStatusTone(tour.lifecycle)}
          event={`${gameTitle(tour.game)} · ${tour.country}`}
          org={tour.organizer}
          sanctionedLabel={tour.isSanctioned ? t('sanctioned') : undefined}
          name={tour.name}
          prizeLabel={t('prizePool')}
          prize={
            tour.prizePoolKWD > 0
              ? t('moneyKwd', { amount: formatAmount(tour.prizePoolKWD) })
              : t('noPrize')
          }
          facts={facts}
          image={tour.coverImageUrl}
          monogram={gameShort(tour.game)}
          actions={
            <>
              {tour.lifecycle === 'draft' ? null : (
                <RegisterTeamButton
                  tournamentSlug={tour.slug}
                  tournamentName={tour.name}
                  isRegistrationOpen={isOpen}
                  alreadyRegistered={Boolean(myRegistration)}
                />
              )}
              {showBracket ? (
                <ButtonLink href="#bracket-title" variant="ink" data-testid="view-bracket">
                  {t('viewBracketCta')}
                </ButtonLink>
              ) : null}
              {canManage ? (
                <ButtonLink
                  href={`/${locale}/manage/tournaments/${tour.slug}`}
                  variant="ghost"
                  data-testid="manage-tournament-link"
                >
                  <Settings2 className="bx-icon" aria-hidden />
                  {t('manageCta')}
                </ButtonLink>
              ) : null}
            </>
          }
        />
      </div>

      {tour.description ? (
        <section className="grid gap-3" aria-labelledby="about-title">
          <SectionTitle id="about-title" title={t('aboutTitle')} />
          <p className="m-0 max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">
            {tour.description}
          </p>
          {tour.rulesUrl ? (
            <a
              href={tour.rulesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bx-label justify-self-start text-gold-text"
              dir="ltr"
            >
              {t('rulesLink')}
            </a>
          ) : null}
        </section>
      ) : null}

      {bracket?.finalDecided && tour.lifecycle === 'completed' ? (
        <section className="grid gap-4" aria-labelledby="standings-title">
          <SectionTitle id="standings-title" title={tBracket('standingsTitle')} />
          <FinalStandings standings={bracket.standings} locale={locale} />
        </section>
      ) : null}

      {showBracket && bracket ? (
        <section className="grid gap-4" aria-labelledby="bracket-title">
          <SectionTitle
            id="bracket-title"
            title={tBracket('title')}
            eyebrow={tBracket('eyebrow', { size: (bracket.rounds[0]?.matches.length ?? 0) * 2 })}
          />
          <BracketBoard bracket={bracket} />
        </section>
      ) : null}

      <section aria-labelledby="registered-teams-title">
        <SectionTitle
          id="registered-teams-title"
          title={tReg('rosterTitle')}
          eyebrow={tReg('registeredCount', { count: registrations.length })}
        />
        {registrations.length === 0 ? (
          <EmptyState title={tReg('rosterEmpty')} />
        ) : (
          <ol className="bx-roster" data-testid="registered-teams">
            {registrations.map(({ registration, team }, i) => {
              const isMine = myTeamIds.has(team.id);
              return (
                <li key={registration.id} className={isMine ? 'bg-gold-soft' : undefined}>
                  <TeamCrest tag={team.tag} color={teamCrestColor(team.slug)} size={40} />
                  <div className="min-w-0">
                    <Link
                      href={`/${locale}/teams/${team.slug}`}
                      className="block truncate font-display text-[16px] font-bold leading-[19px] text-ink no-underline hover:text-gold-text"
                    >
                      {team.name}
                    </Link>
                    <small>{team.tag}</small>
                  </div>
                  {isMine ? (
                    <Tag tone="gold">{tReg('yourTeamPill')}</Tag>
                  ) : (
                    <Tag tone={registration.status === 'pending_payment' ? 'soft' : 'neutral'}>
                      {tReg(registrationStatusKey(registration.status))}
                    </Tag>
                  )}
                  <span
                    className={[
                      'bx-roster__rating',
                      isMine ? 'text-gold-text' : 'text-ink-faint',
                    ].join(' ')}
                  >
                    #{(registration.seedNumber ?? i + 1).toString().padStart(2, '0')}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
