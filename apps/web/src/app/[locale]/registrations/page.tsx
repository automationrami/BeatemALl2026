import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { listRegistrationsForPlayer } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

function statusTone(status: string): 'amber' | 'lime' | 'coral' | 'cyan' | 'default' {
  if (status === 'pending_payment') return 'amber';
  if (status === 'confirmed' || status === 'checked_in') return 'lime';
  if (status === 'disqualified' || status === 'withdrawn') return 'coral';
  return 'default';
}

export default async function RegistrationsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const t = await getTranslations('registration');

  const registrations = await listRegistrationsForPlayer(me.playerId, me.userId);

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

      <section className="mb-8">
        <p className="bx-eyebrow mb-3">{t('inboxEyebrow')}</p>
        <h1 className="font-display font-medium text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.035em] mb-4">
          {t('inboxTitle')}
        </h1>
        <p className="text-[var(--t-3)] max-w-xl text-base leading-relaxed">
          {registrations.length === 0
            ? t('inboxEmpty')
            : t('inboxSubtitle', { count: registrations.length })}
        </p>
      </section>

      {registrations.length === 0 ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-8 text-center">
          {t('inboxEmpty')}
        </p>
      ) : (
        <section className="space-y-3" data-testid="registration-rows">
          {registrations.map(({ registration, tournament, team, game }) => {
            return (
              <Link
                key={registration.id}
                href={`/${locale}/registrations/${registration.id}`}
                className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-4 hover:bg-[var(--bg-3)] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-display font-medium text-[15px] truncate">
                    {t('rowHeadline', { tournament: tournament.name, team: team.name })}
                  </p>
                  <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-0.5">
                    {game.name} · {tournament.startsInLabel ?? ''}
                  </p>
                </div>
                <Pill tone={statusTone(registration.status)}>
                  {t(
                    `status${registration.status
                      .split('_')
                      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                      .join('')}` as
                      | 'statusPendingPayment'
                      | 'statusConfirmed'
                      | 'statusCheckedIn'
                      | 'statusDisqualified'
                      | 'statusWithdrawn',
                  )}
                </Pill>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
