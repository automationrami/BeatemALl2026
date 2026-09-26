import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CalendarCheck } from 'lucide-react';
import { EmptyState, PageHead, buttonClass } from '@beat-em-all/ui';
import { listVenues } from '@beat-em-all/db/queries';
import { VenueCard } from '@/components/venue/VenueCard';

type PageProps = { params: Promise<{ locale: string }> };

export default async function VenuesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const venues = await listVenues();
  const t = await getTranslations('venue');

  const cities = Array.from(new Set(venues.map((v) => v.city)));

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[
          t('countEyebrow', { count: venues.length }),
          ...(cities.length > 0 ? [cities.join(' · ')] : []),
        ]}
        title={t('indexTitle')}
        description={t('indexSubtitle')}
        aside={
          <Link href={`/${locale}/bookings`} className={buttonClass('ink', 'sm')}>
            <CalendarCheck className="bx-icon" aria-hidden />
            {t('myBookings')}
          </Link>
        }
      />

      {venues.length === 0 ? (
        <EmptyState title={t('emptyList')} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('indexTitle')}>
          {venues.map((v) => (
            <VenueCard key={v.id} venue={v} locale={locale} />
          ))}
        </section>
      )}
    </main>
  );
}
