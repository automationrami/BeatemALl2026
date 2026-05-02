import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import { listSurfaceableTournaments } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';

type PageProps = { params: Promise<{ locale: string }> };

function formatKwd(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const formatted = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K`;
  }
  return amount.toLocaleString();
}

export default async function TournamentsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tournaments = await listSurfaceableTournaments();
  const t = await getTranslations('tournament');

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

      {tournaments.length === 0 ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-12 text-center">
          {t('emptyList')}
        </p>
      ) : (
        <section className="space-y-3">
          {tournaments.map((tour) => (
            <Link
              key={tour.id}
              href={`/${locale}/tournaments/${tour.slug}`}
              className={[
                'flex items-center gap-4 rounded-[20px] border bg-[var(--bg-2)] p-5 hover:bg-[var(--bg-3)] transition-colors',
                tour.isSanctioned
                  ? 'border-[var(--line)] border-s-2 border-s-[var(--cyan-2)]'
                  : 'border-[var(--line)]',
              ].join(' ')}
            >
              <span
                className="w-16 h-16 rounded-xl shrink-0 grid place-items-center font-display font-bold text-white text-[18px]"
                style={{
                  background: `linear-gradient(135deg, ${tour.organizerAccent}, ${tour.organizerAccent}55)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                aria-hidden
              >
                {tour.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-medium text-[18px] truncate">{tour.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <Pill>{GAMES[tour.game]?.shortName ?? tour.game}</Pill>
                  <span className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase">
                    {tour.organizer}
                  </span>
                  {tour.isSanctioned ? (
                    <Pill tone="cyan" dot>
                      {t('sanctioned')}
                    </Pill>
                  ) : null}
                </div>
              </div>
              <div className="text-end shrink-0">
                {tour.prizePoolKWD > 0 ? (
                  <p className="bx-num text-[24px]">
                    {t('prizePoolLabel', { amount: formatKwd(tour.prizePoolKWD) })}
                  </p>
                ) : (
                  <p className="font-mono text-[11px] text-[var(--t-4)] uppercase tracking-[0.08em]">
                    {t('free')}
                  </p>
                )}
                <p className="font-mono text-[10.5px] text-[var(--t-3)] tracking-[0.06em] mt-1">
                  {tour.startsInLabel}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
