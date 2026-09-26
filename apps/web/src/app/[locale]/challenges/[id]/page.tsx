import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarRange, Check, ChevronLeft, MapPin } from 'lucide-react';
import { Notice, Tag, buttonClass } from '@beat-em-all/ui';
import {
  MAX_COUNTER_PROPOSALS,
  canViewChallenge,
  isTeamLeaderRole,
  loadChallengeById,
  loadChallengeNegotiations,
  loadRespondingTeamId,
} from '@beat-em-all/db/queries';
import { teamCrestColor } from '@/components/tournament/display';
import { ChallengeActions } from '@/components/challenge/ChallengeActions';
import { ChallengeHero } from '@/components/challenge/ChallengeHero';
import {
  challengeStatusKey,
  challengeStatusTone,
  formatDateTime,
  formatDayRange,
} from '@/components/challenge/challengeStatus';
import { getCurrentUser } from '@/lib/current-user';

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await loadChallengeById(id);
  if (!data) notFound();

  const me = await getCurrentUser();
  // Private to the two teams: everyone else gets the same page as a missing id.
  if (!(await canViewChallenge(data.challenge, me.playerId))) notFound();

  const [negotiations, respondingTeamId] = await Promise.all([
    loadChallengeNegotiations(id),
    loadRespondingTeamId(data.challenge),
  ]);
  const t = await getTranslations('challenge');

  const isPending = ['pending', 'negotiating'].includes(data.challenge.status);
  const respondingTeam =
    respondingTeamId === data.challengerTeam.id ? data.challengerTeam : data.challengedTeam;
  const myRoleOnResponding = me.teamMemberships.find((m) => m.teamId === respondingTeamId)?.role;
  // The captain or co-captain of the side the latest proposal went to makes the next move.
  const canAct = isPending && isTeamLeaderRole(myRoleOnResponding);

  const statusLabel = t(challengeStatusKey(data.challenge.status));
  // Someone on the side that just proposed is waiting, even if they also play for the other side.
  const proposingTeamId =
    respondingTeamId === data.challengerTeam.id ? data.challengedTeam.id : data.challengerTeam.id;
  const onProposingSide = me.teamMemberships.some((m) => m.teamId === proposingTeamId);
  const turnNote = !isPending
    ? statusLabel
    : canAct
      ? t('yourTurn')
      : myRoleOnResponding && !onProposingSide
        ? t('captainOnly', { team: respondingTeam.name })
        : t('waitingFor', { team: respondingTeam.name });

  // Format dates server-side in Kuwait time so the displayed time matches what the
  // founder typed in `datetime-local` (toISOString() output was always UTC).
  const dateRange = `${formatDateTime(locale, data.challenge.proposedDateRangeStart)} – ${formatDateTime(locale, data.challenge.proposedDateRangeEnd)}`;

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: t('detailFormat'), value: data.challenge.proposedFormat.toUpperCase() },
    { label: t('detailGame'), value: data.game.name },
    { label: t('detailWindow'), value: dateRange },
    {
      label: t('detailVenue'),
      value: data.challenge.proposedVenueSlug ? (
        <Link
          href={`/${locale}/venues/${data.challenge.proposedVenueSlug}`}
          className="inline-flex items-center gap-1.5 text-gold-text hover:underline"
        >
          <MapPin className="bx-icon" aria-hidden />
          {data.challenge.proposedVenueSlug}
        </Link>
      ) : (
        t('inboxVenueTbd')
      ),
    },
    ...(data.challenge.expiresAt && isPending
      ? [{ label: t('detailRespondBy'), value: formatDateTime(locale, data.challenge.expiresAt) }]
      : []),
  ];

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/challenges`}
          className={buttonClass('ghost', 'sm', false, 'justify-self-start')}
        >
          <ChevronLeft className="bx-icon bx-flip" aria-hidden />
          {t('inboxTitle')}
        </Link>

        <ChallengeHero
          title={t('detailVs', {
            challenger: data.challengerTeam.name,
            challenged: data.challengedTeam.name,
          })}
          challenger={{
            name: data.challengerTeam.name,
            tag: data.challengerTeam.tag,
            sub: data.challengerTeam.city,
            role: t('detailChallenger'),
            color: teamCrestColor(data.challengerTeam.slug),
          }}
          challenged={{
            name: data.challengedTeam.name,
            tag: data.challengedTeam.tag,
            sub: data.challengedTeam.city,
            role: t('detailChallenged'),
            color: teamCrestColor(data.challengedTeam.slug),
          }}
          tags={
            <>
              <Tag tone={challengeStatusTone(data.challenge.status)}>{statusLabel}</Tag>
              <Tag tone="paper">{data.challenge.proposedFormat.toUpperCase()}</Tag>
              <span className="bx-eyebrow ms-1 text-on-band-muted">
                {t('detailEyebrow')} · {data.game.name}
              </span>
            </>
          }
        />

        {data.challenge.matchId ? (
          <div data-testid="accepted-notice">
            <Notice mark={<Check className="bx-icon" aria-hidden />}>{t('acceptedNotice')}</Notice>
          </div>
        ) : null}
      </div>

      <div className="bx-two">
        <section
          className="bx-card grid gap-6 p-5 min-[900px]:p-8"
          aria-labelledby="current-proposal"
        >
          <h2 id="current-proposal" className="bx-label text-ink">
            {t('currentProposal')}
          </h2>

          <dl className="bx-inset grid divide-y divide-line">
            {facts.map((f) => (
              <div
                key={f.label}
                className="grid grid-cols-1 gap-1 px-4 py-3 min-[600px]:grid-cols-[160px_minmax(0,1fr)] min-[600px]:gap-4"
              >
                <dt className="bx-eyebrow self-center">{f.label}</dt>
                <dd className="font-display text-[15px] font-bold text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>

          {data.challenge.message ? (
            <blockquote className="border-s-2 border-gold-500 ps-4 text-[15px] leading-relaxed text-ink-muted">
              {data.challenge.message}
            </blockquote>
          ) : null}

          <div className="border-t border-line pt-6">
            <ChallengeActions
              challengeId={data.challenge.id}
              canAct={canAct}
              note={turnNote}
              counters={{ used: Math.max(0, negotiations.length - 1), max: MAX_COUNTER_PROPOSALS }}
              current={{
                format: data.challenge.proposedFormat,
                start: data.challenge.proposedDateRangeStart.toISOString(),
                end: data.challenge.proposedDateRangeEnd.toISOString(),
              }}
            />
          </div>
        </section>

        {negotiations.length > 0 ? (
          <section
            className="bx-card grid gap-5 p-5 min-[900px]:p-8"
            aria-labelledby="negotiation-history"
          >
            <h2 id="negotiation-history" className="bx-label text-ink">
              {t('negotiationHistory')}
            </h2>
            <ol className="grid gap-5 border-s border-line-strong ps-5">
              {negotiations.map((n, i) => {
                const proposedByName =
                  n.proposedByTeamId === data.challengerTeam.id
                    ? data.challengerTeam.name
                    : data.challengedTeam.name;
                const latest = i === negotiations.length - 1;
                return (
                  <li key={n.id} className="relative grid gap-1.5">
                    <span
                      aria-hidden
                      className={[
                        'absolute -start-[26px] top-1 size-2.5 rounded-full',
                        latest ? 'bg-[image:var(--gradient-gold)]' : 'bg-surface-300',
                      ].join(' ')}
                    />
                    <p className="bx-eyebrow">{formatDateTime(locale, n.createdAt)}</p>
                    <p className="font-display text-[15px] font-bold text-ink">
                      {t('proposedBy', { team: proposedByName })}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                      <Tag>{n.proposedFormat.toUpperCase()}</Tag>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange className="bx-icon" aria-hidden />
                        {formatDayRange(locale, n.proposedDateRangeStart, n.proposedDateRangeEnd)}
                      </span>
                      {n.proposedVenueSlug ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="bx-icon" aria-hidden />
                          {n.proposedVenueSlug}
                        </span>
                      ) : null}
                    </p>
                    {n.message ? (
                      <p className="text-[13px] leading-relaxed text-ink-muted">{n.message}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>
    </main>
  );
}
