import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Building2, Clock, Gamepad2, Landmark, Mail, MapPin, Phone, User } from 'lucide-react';
import { EmptyState, PageHead, SectionTitle, StatStrip, Tag } from '@beat-em-all/ui';
import { isPlatformAdmin, loadPlatformOverview } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { dateLocale, formatAmount } from '@/components/booking/format';
import { ReviewActions } from '@/components/admin/ReviewActions';
import { openingHoursText } from '@/components/venue-owner/hours';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

/** A-01 + A-02: Beat'Em All staff review applications and see the platform at a glance. */
export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  if (!(await isPlatformAdmin(me.userId))) notFound();

  const [t, tvo, overview] = await Promise.all([
    getTranslations('admin'),
    getTranslations('venueOwner'),
    loadPlatformOverview(),
  ]);
  const { counts, pendingVenues, pendingOrganizations } = overview;
  const queued = pendingVenues.length + pendingOrganizations.length;
  const date = new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: 'medium',
    timeZone: 'Asia/Kuwait',
  });

  const line = (icon: React.ReactNode, text: React.ReactNode, ltr = false) => (
    <span className="inline-flex min-w-0 items-center gap-1.5" dir={ltr ? 'ltr' : undefined}>
      {icon}
      <span className="truncate">{text}</span>
    </span>
  );

  return (
    <main className="bx-page">
      <PageHead eyebrow={[t('eyebrow')]} title={t('title')} description={t('description')}>
        <StatStrip
          bordered
          items={[
            { label: t('stat.players'), value: counts.players },
            { label: t('stat.teams'), value: counts.teams },
            { label: t('stat.venues'), value: counts.liveVenues },
            { label: t('stat.organizations'), value: counts.organizations },
            { label: t('stat.bookings'), value: counts.bookings },
            { label: t('stat.tournaments'), value: counts.tournaments },
          ]}
        />
      </PageHead>

      <section className="grid gap-4" aria-labelledby="admin-queue-title" data-testid="admin-queue">
        <SectionTitle
          id="admin-queue-title"
          eyebrow={t('queueEyebrow', { count: queued })}
          title={t('queueTitle')}
        />

        {queued === 0 ? <EmptyState title={t('queueEmpty')} /> : null}

        {pendingVenues.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="bx-label m-0 text-ink">{t('venuesTitle')}</h3>
            <ul className="m-0 grid list-none gap-3 p-0">
              {pendingVenues.map((v) => (
                <li
                  key={v.slug}
                  className="bx-card grid gap-4 p-5"
                  data-testid={`admin-venue-${v.slug}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid min-w-0 gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="soft" icon={<Building2 className="bx-icon" aria-hidden />}>
                          {t('kindVenue')}
                        </Tag>
                        <span className="bx-eyebrow">
                          {t('submitted', { date: date.format(v.submittedAt) })}
                        </span>
                      </div>
                      <p className="m-0 font-display text-[20px] font-bold leading-[24px] text-ink">
                        {v.name}
                      </p>
                      {v.organization ? (
                        <p className="m-0 text-[13px] text-ink-muted">
                          {t('organization', { name: v.organization.name })}
                        </p>
                      ) : null}
                    </div>
                    <span className="bx-num bx-gold-num text-[24px]">
                      {t('rate', { amount: formatAmount(v.hourlyRateKwd) })}
                    </span>
                  </div>
                  <div className="grid gap-2 text-[13px] text-ink-muted min-[700px]:grid-cols-2">
                    {line(
                      <MapPin className="bx-icon size-3.5 shrink-0" aria-hidden />,
                      v.address ? `${v.address}, ${v.city}` : v.city,
                    )}
                    {line(
                      <Clock className="bx-icon size-3.5 shrink-0" aria-hidden />,
                      `${openingHoursText(tvo, v)} · ${t('cancelWindow', { hours: v.cancellationWindowHours })}`,
                    )}
                    {line(
                      <Gamepad2 className="bx-icon size-3.5 shrink-0" aria-hidden />,
                      `${v.games.map((g) => `${g.name} (${g.seatsCount})`).join(' · ')} · ${t('seats', { count: v.totalSeats })}`,
                    )}
                    {v.applicant
                      ? line(
                          <User className="bx-icon size-3.5 shrink-0" aria-hidden />,
                          t('applicant', { name: v.applicant }),
                        )
                      : null}
                    {v.phoneNumber
                      ? line(
                          <Phone className="bx-icon size-3.5 shrink-0" aria-hidden />,
                          v.phoneNumber,
                          true,
                        )
                      : null}
                    {v.email
                      ? line(
                          <Mail className="bx-icon size-3.5 shrink-0" aria-hidden />,
                          v.email,
                          true,
                        )
                      : null}
                  </div>
                  {v.description ? (
                    <p className="m-0 max-w-[70ch] text-[14px] text-ink-muted">{v.description}</p>
                  ) : null}
                  <ReviewActions kind="venue" slug={v.slug} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {pendingOrganizations.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="bx-label m-0 text-ink">{t('organizationsTitle')}</h3>
            <ul className="m-0 grid list-none gap-3 p-0">
              {pendingOrganizations.map((o) => (
                <li
                  key={o.slug}
                  className="bx-card grid gap-4 p-5"
                  data-testid={`admin-org-${o.slug}`}
                >
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone="soft" icon={<Landmark className="bx-icon" aria-hidden />}>
                        {t(`tier.${o.tier}`)}
                      </Tag>
                      <span className="bx-eyebrow">
                        {t('submitted', { date: date.format(o.submittedAt) })}
                      </span>
                    </div>
                    <p className="m-0 font-display text-[20px] font-bold leading-[24px] text-ink">
                      {o.name}
                    </p>
                  </div>
                  <div className="grid gap-2 text-[13px] text-ink-muted min-[700px]:grid-cols-2">
                    {line(
                      <MapPin className="bx-icon size-3.5 shrink-0" aria-hidden />,
                      o.countryCode,
                    )}
                    {o.applicant
                      ? line(
                          <User className="bx-icon size-3.5 shrink-0" aria-hidden />,
                          t('applicant', { name: o.applicant }),
                        )
                      : null}
                    {o.contactPhone
                      ? line(
                          <Phone className="bx-icon size-3.5 shrink-0" aria-hidden />,
                          o.contactPhone,
                          true,
                        )
                      : null}
                    {o.contactEmail
                      ? line(
                          <Mail className="bx-icon size-3.5 shrink-0" aria-hidden />,
                          o.contactEmail,
                          true,
                        )
                      : null}
                  </div>
                  {o.description ? (
                    <p className="m-0 max-w-[70ch] text-[14px] text-ink-muted">{o.description}</p>
                  ) : null}
                  <ReviewActions kind="organization" slug={o.slug} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
