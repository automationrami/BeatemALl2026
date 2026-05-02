import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button, Pill, Wordmark } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import { loadVenueBySlug } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default async function VenueDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const venue = await loadVenueBySlug(slug);
  if (!venue) notFound();

  const t = await getTranslations('venue');

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

      <section className="bx-card p-7 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-7 items-start">
          <span
            className="w-[120px] h-[120px] rounded-2xl shrink-0 grid place-items-center font-display font-bold text-white text-[36px]"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.22), rgba(139,92,246,0.10))',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
            aria-hidden
          >
            {venue.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="bx-eyebrow mb-2">
              VENUE · {venue.country} · {venue.city}
            </p>
            <h1 className="font-display font-medium text-[44px] md:text-[56px] leading-[0.95] tracking-[-0.035em] mb-2">
              {venue.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3 mb-4">
              {venue.isVerified ? (
                <Pill tone="cyan" dot>
                  {t('verified')}
                </Pill>
              ) : null}
              {venue.rating !== null ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.30)] font-display font-medium text-[10.5px] text-[var(--amber)]">
                  <Star size={12} className="text-[var(--amber)] fill-[var(--amber)]" aria-hidden />
                  {t('ratingLabel', { rating: venue.rating.toFixed(1) })}
                </span>
              ) : null}
              <Pill>{t('perHour', { rate: venue.hourlyRateKWD })}</Pill>
            </div>
          </div>
          <div className="md:text-end text-start flex flex-col gap-2">
            <Button tone="primary" size="md">
              {t('bookCta')} →
            </Button>
            <Button tone="ghost" size="sm">
              {t('directionsCta')}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
          <p className="bx-eyebrow mb-4">{t('supportedGames')}</p>
          <div className="flex flex-wrap gap-2">
            {venue.supportedGames.length === 0 ? (
              <p className="text-[var(--t-4)] text-sm">—</p>
            ) : (
              venue.supportedGames.map((g) => (
                <Pill key={g} tone="violet">
                  {GAMES[g]?.shortName ?? g}
                </Pill>
              ))
            )}
          </div>
        </div>
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
          <p className="bx-eyebrow mb-4">{t('location')}</p>
          <p className="font-display font-medium text-[16px] mb-1">{venue.city}</p>
          <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase">
            {venue.country} · {venue.geo.lat.toFixed(4)}, {venue.geo.lng.toFixed(4)}
          </p>
        </div>
      </section>
    </main>
  );
}
