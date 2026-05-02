import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import { listVenues } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';

type PageProps = { params: Promise<{ locale: string }> };

export default async function VenuesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const venues = await listVenues();
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

      <section className="mb-10">
        <p className="bx-eyebrow mb-3">{t('indexEyebrow')}</p>
        <h1 className="font-display font-medium text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.035em] mb-4">
          {t('indexTitle')}
        </h1>
        <p className="text-[var(--t-3)] max-w-xl text-base leading-relaxed">{t('indexSubtitle')}</p>
      </section>

      {venues.length === 0 ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-12 text-center">
          {t('emptyList')}
        </p>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/${locale}/venues/${v.slug}`}
              className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 hover:bg-[var(--bg-3)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className="w-14 h-14 rounded-xl shrink-0 grid place-items-center font-display font-bold text-white text-[16px]"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(139,92,246,0.10))',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  aria-hidden
                >
                  {v.name.slice(0, 2).toUpperCase()}
                </span>
                {v.rating !== null ? (
                  <span className="inline-flex items-center gap-1 font-display font-medium text-[13px] text-white">
                    <Star
                      size={14}
                      className="text-[var(--amber)] fill-[var(--amber)]"
                      aria-hidden
                    />
                    {v.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
              <h2 className="font-display font-medium text-[20px] tracking-[-0.02em] mb-1 truncate">
                {v.name}
              </h2>
              <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mb-3">
                {v.city} · {v.country}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {v.supportedGames.slice(0, 3).map((g) => (
                  <Pill key={g}>{GAMES[g]?.shortName ?? g}</Pill>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">
                  {t('perHour', { rate: v.hourlyRateKWD })}
                </span>
                {v.isVerified ? (
                  <Pill tone="cyan" dot>
                    {t('verified')}
                  </Pill>
                ) : null}
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
