import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, EmptyState, SectionTitle, Tag, TeamCrest } from '@beat-em-all/ui';
import { listRegistrationsForTournament, loadTournamentBySlug } from '@beat-em-all/db/queries';
import { RegisterTeamButton } from '@/components/tournament/RegisterTeamButton';
import { TournamentHero } from '@/components/tournament/TournamentHero';
import {
  formatAmount,
  gameShort,
  gameTitle,
  teamCrestColor,
  tournamentStatusTone,
} from '@/components/tournament/display';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default async function TournamentDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tour = await loadTournamentBySlug(slug);
  if (!tour) notFound();

  // Tournament detail is public — gracefully degrade when the persona cookie is stale
  // or missing. We just lose the "Register" CTA + "your team" highlight, not the whole
  // page. Otherwise a stale cookie would 500 anonymous viewers reading the bracket.
  const [registrations, me] = await Promise.all([
    listRegistrationsForTournament(slug),
    getCurrentUser().catch(() => null),
  ]);
  const myTeamIds = new Set(me?.teamMemberships.map((m) => m.teamId) ?? []);
  const myRegistration = me ? registrations.find((r) => myTeamIds.has(r.team.id)) : undefined;

  const t = await getTranslations('tournament');
  const tReg = await getTranslations('registration');

  const statusLabel =
    tour.status === 'in_progress'
      ? t('inProgress')
      : tour.status === 'registration_open'
        ? t('registrationOpen')
        : t('upcoming');

  const facts = [
    // The seeded labels already read as sentences ("Starts in 12d"), so no key prefix.
    ...(tour.startsInLabel ? [{ k: null, v: tour.startsInLabel }] : []),
    ...(tour.registrationLabel ? [{ k: null, v: tour.registrationLabel }] : []),
    { k: t('registeredLabel'), v: tReg('registeredCount', { count: registrations.length }) },
  ];

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

        <TournamentHero
          status={statusLabel}
          statusTone={tournamentStatusTone(tour.status)}
          event={`${gameTitle(tour.game)} · ${tour.country}`}
          org={tour.organizer}
          sanctionedLabel={tour.isSanctioned ? t('sanctioned') : undefined}
          name={tour.name}
          prizeLabel={t('prizePool')}
          prize={
            tour.prizePoolKWD > 0
              ? t('moneyKwd', { amount: formatAmount(tour.prizePoolKWD) })
              : t('free')
          }
          facts={facts}
          image={tour.coverImageUrl}
          monogram={gameShort(tour.game)}
          actions={
            <>
              <RegisterTeamButton
                tournamentSlug={tour.slug}
                tournamentName={tour.name}
                isRegistrationOpen={tour.status === 'registration_open'}
                alreadyRegistered={Boolean(myRegistration)}
              />
              <Button variant="ink">{t('viewBracketCta')}</Button>
            </>
          }
        />
      </div>

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
                      {registration.status === 'pending_payment'
                        ? tReg('statusPendingPayment')
                        : tReg('statusConfirmed')}
                    </Tag>
                  )}
                  <span
                    className={[
                      'bx-roster__rating',
                      isMine ? 'text-gold-text' : 'text-ink-faint',
                    ].join(' ')}
                  >
                    #{(i + 1).toString().padStart(2, '0')}
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
