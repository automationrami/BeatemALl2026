import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { EmptyState, PageHead, StatStrip, Tag } from '@beat-em-all/ui';
import { ButtonLink } from '@/components/tournament/ButtonLink';
import { listSurfaceableTournaments } from '@beat-em-all/db/queries';
import {
  formatAmount,
  gameTitle,
  tournamentLifecycleKey,
  tournamentStatusTone,
} from '@/components/tournament/display';
import { formatKuwaitDateTime } from '@/components/tournament-admin/time';

// Live data: new tournaments and venues appear without a redeploy.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function TournamentsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tournaments = await listSurfaceableTournaments();
  const t = await getTranslations('tournament');

  const prizeTotal = tournaments.reduce((sum, tour) => sum + tour.prizePoolKWD, 0);
  const openCount = tournaments.filter((tour) => tour.lifecycle === 'registration_open').length;
  const liveCount = tournaments.filter((tour) => tour.lifecycle === 'in_progress').length;
  const sanctionedCount = tournaments.filter((tour) => tour.isSanctioned).length;

  const statusLabel = (status: string) => t(tournamentLifecycleKey(status));

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('indexEyebrow'), t('eventCount', { count: tournaments.length })]}
        title={t('indexTitle')}
        description={t('indexSubtitle')}
      >
        {/* Four numbers crowd a phone: the prize total gets its own row below md. */}
        <div className="max-md:[&_.bx-stat:first-child]:col-span-full max-md:[&_.bx-stat:nth-child(2)]:border-s-0 max-md:[&_.bx-stat:nth-child(n+2)]:border-t max-md:[&_.bx-stat:nth-child(n+2)]:border-line max-md:[&_.bx-stat]:px-5 max-md:[&_.bx-stats]:grid-cols-3">
          <StatStrip
            bordered
            items={[
              {
                label: t('statPrizeTotal'),
                value: t('moneyKwd', { amount: formatAmount(prizeTotal) }),
                tone: 'gold',
              },
              { label: t('statOpen'), value: openCount },
              { label: t('statLive'), value: liveCount },
              { label: t('statSanctioned'), value: sanctionedCount, of: tournaments.length },
            ]}
          />
        </div>
      </PageHead>

      {tournaments.length === 0 ? (
        <EmptyState title={t('emptyList')} />
      ) : (
        <section className="grid gap-4" aria-label={t('indexTitle')}>
          {tournaments.map((tour) => {
            const href = `/${locale}/tournaments/${tour.slug}`;
            const isOpen = tour.lifecycle === 'registration_open';
            const when =
              tour.startsInLabel ||
              (tour.startsAt
                ? t('startsOn', { date: formatKuwaitDateTime(tour.startsAt, locale) })
                : '');
            return (
              <article
                key={tour.id}
                className="bx-card bx-card--flat grid gap-4 p-4 transition-colors hover:bg-surface-200 md:grid-cols-[148px_minmax(0,1fr)_auto] md:items-center md:p-5"
              >
                <div className="bx-inset grid min-h-[48px] place-items-center px-3 py-2 text-center font-display text-[15px] font-extrabold uppercase italic leading-[17px] text-ink md:min-h-[88px]">
                  {gameTitle(tour.game)}
                </div>

                <div className="grid min-w-0 gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tour.isSanctioned ? (
                      <Tag
                        tone="org"
                        icon={
                          <ShieldCheck
                            className="bx-icon"
                            role="img"
                            aria-label={t('sanctioned')}
                          />
                        }
                      >
                        {tour.organizer}
                      </Tag>
                    ) : (
                      <Tag>{tour.organizer}</Tag>
                    )}
                    <Tag tone={tournamentStatusTone(tour.lifecycle)}>
                      {statusLabel(tour.lifecycle)}
                    </Tag>
                  </div>
                  <h2 className="m-0 font-display text-[22px] font-bold leading-[26px] text-ink">
                    <Link
                      href={href}
                      className="text-ink no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                    >
                      {tour.name}
                    </Link>
                  </h2>
                  {when ? (
                    <p className="m-0 text-[13px] font-medium leading-[18px] text-ink-muted">
                      {when}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-line pt-4 md:justify-end md:border-t-0 md:pt-0">
                  <div className="grid gap-1 md:text-end">
                    <span className="bx-eyebrow">{t('prizePool')}</span>
                    {tour.prizePoolKWD > 0 ? (
                      <b className="bx-num bx-gold-num text-[26px] leading-[28px]">
                        {t('moneyKwd', { amount: formatAmount(tour.prizePoolKWD) })}
                      </b>
                    ) : (
                      <b className="font-display text-[18px] font-bold leading-[28px] text-ink">
                        {t('free')}
                      </b>
                    )}
                  </div>
                  {isOpen ? (
                    <ButtonLink href={href} variant="gold" size="sm" className="relative z-10">
                      {t('registerCta')}
                    </ButtonLink>
                  ) : (
                    <ChevronRight className="bx-icon bx-flip text-ink-muted" aria-hidden />
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
