import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, Pill, StatCard, Wordmark } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import {
  listRegistrationsForTournament,
  loadTournamentBySlug,
} from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { RegisterTeamButton } from '@/components/tournament/RegisterTeamButton';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

function formatKwd(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const formatted = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K`;
  }
  return amount.toLocaleString();
}

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
        : tour.startsInLabel;

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-10">
        <Link href={`/${locale}`}>
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <section
        className="rounded-[20px] p-7 mb-4"
        style={{
          background: `radial-gradient(120% 80% at 100% 0%, ${tour.organizerAccent}33, transparent 55%), radial-gradient(120% 80% at 0% 100%, rgba(139,92,246,0.18), transparent 55%), linear-gradient(180deg,#16131F,#0F1015)`,
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <p className="bx-eyebrow mb-3">
          TOURNAMENT · {tour.country} · {GAMES[tour.game]?.shortName ?? tour.game}
        </p>
        <h1 className="font-display font-medium text-[44px] md:text-[64px] leading-[0.95] tracking-[-0.035em] mb-3">
          {tour.name}
        </h1>
        <div className="flex flex-wrap gap-2 mt-3 mb-5">
          {tour.isSanctioned ? (
            <Pill tone="cyan" dot>
              {t('sanctioned')}
            </Pill>
          ) : null}
          <Pill>{statusLabel}</Pill>
          <span className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">
            {tour.organizer}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <RegisterTeamButton
            tournamentSlug={tour.slug}
            tournamentName={tour.name}
            isRegistrationOpen={tour.status === 'registration_open'}
            alreadyRegistered={Boolean(myRegistration)}
          />
          <Button tone="ghost" size="md">
            {t('viewBracketCta')}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
        <StatCard
          label={t('prizePoolLabel', { amount: '' }).trim().replace(/^—/, '').trim() || 'PRIZE'}
          value={tour.prizePoolKWD > 0 ? `${formatKwd(tour.prizePoolKWD)} KWD` : t('free')}
        />
        <StatCard label="STATUS" value={statusLabel} />
        <StatCard
          label={tReg('registeredEyebrow')}
          value={tReg('registeredCount', { count: registrations.length })}
        />
      </section>

      <section className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
        <p className="bx-eyebrow mb-4">{tReg('rosterEyebrow')}</p>
        {registrations.length === 0 ? (
          <p className="text-[var(--t-3)] text-sm leading-relaxed">{tReg('rosterEmpty')}</p>
        ) : (
          <ol className="space-y-2" data-testid="registered-teams">
            {registrations.map(({ registration, team }, i) => {
              const isMine = myTeamIds.has(team.id);
              return (
                <li
                  key={registration.id}
                  className={[
                    'flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors',
                    isMine
                      ? 'border-[var(--violet-2)] bg-[rgba(139,92,246,0.10)]'
                      : 'border-[var(--line)] bg-[var(--bg-1)]',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.06em] tabular-nums">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <Link
                      href={`/${locale}/teams/${team.slug}`}
                      className="font-display font-medium text-[14px] truncate hover:text-[var(--violet-2)] transition-colors"
                    >
                      {team.name}
                    </Link>
                    <span className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.06em] uppercase">
                      {team.tag}
                    </span>
                  </div>
                  {isMine ? (
                    <Pill tone="violet">{tReg('yourTeamPill')}</Pill>
                  ) : (
                    <Pill>
                      {registration.status === 'pending_payment'
                        ? tReg('statusPendingPayment')
                        : tReg('statusConfirmed')}
                    </Pill>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
