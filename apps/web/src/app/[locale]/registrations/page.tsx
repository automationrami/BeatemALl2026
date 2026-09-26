import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EmptyState, PageHead, StatStrip, Tag, TeamCrest } from '@beat-em-all/ui';
import { ButtonLink } from '@/components/tournament/ButtonLink';
import { listRegistrationsForPlayer } from '@beat-em-all/db/queries';
import {
  registrationStatusKey,
  registrationStatusTone,
  teamCrestColor,
} from '@/components/tournament/display';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function RegistrationsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const t = await getTranslations('registration');

  const registrations = await listRegistrationsForPlayer(me.playerId, me.userId);

  const activeCount = registrations.filter(
    ({ registration }) =>
      registration.status === 'confirmed' || registration.status === 'checked_in',
  ).length;
  const pendingCount = registrations.filter(
    ({ registration }) => registration.status === 'pending_payment',
  ).length;

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('inboxEyebrow')]}
        title={t('inboxTitle')}
        description={
          registrations.length === 0
            ? undefined
            : t('inboxSubtitle', { count: registrations.length })
        }
      >
        <StatStrip
          bordered
          items={[
            { label: t('statTotal'), value: registrations.length },
            { label: t('statActive'), value: activeCount, tone: 'gold' },
            { label: t('statPending'), value: pendingCount },
          ]}
        />
      </PageHead>

      {registrations.length === 0 ? (
        <EmptyState
          title={t('inboxEmpty')}
          action={
            <ButtonLink href={`/${locale}/tournaments`} variant="gold">
              {t('browseCta')}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0" data-testid="registration-rows">
          {registrations.map(({ registration, tournament, team, game }) => (
            <li key={registration.id}>
              <Link
                href={`/${locale}/registrations/${registration.id}`}
                className="bx-card bx-card--flat grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-ink no-underline transition-colors hover:bg-surface-200 md:gap-4"
              >
                <TeamCrest tag={team.tag} color={teamCrestColor(team.slug)} size={48} />
                <div className="grid min-w-0 gap-1">
                  <b className="truncate font-display text-[17px] font-bold leading-[21px]">
                    {tournament.name}
                  </b>
                  <small className="truncate text-[13px] font-medium leading-[17px] text-ink-muted">
                    {team.name} · {game.name}
                    {tournament.startsInLabel ? ` · ${tournament.startsInLabel}` : ''}
                  </small>
                  <span className="sm:hidden">
                    <Tag tone={registrationStatusTone(registration.status)}>
                      {t(registrationStatusKey(registration.status))}
                    </Tag>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex">
                    <Tag tone={registrationStatusTone(registration.status)}>
                      {t(registrationStatusKey(registration.status))}
                    </Tag>
                  </span>
                  <ChevronRight className="bx-icon bx-flip text-ink-muted" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
