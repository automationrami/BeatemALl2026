import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { LanguageToggle } from '@/components/LanguageToggle';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations();

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      {/* Top bar */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <Wordmark />
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      {/* Hero */}
      <section className="mb-16">
        <p className="bx-eyebrow mb-6">PHASE 1 · LOCALHOST · MOCK DATA</p>
        <h1 className="font-display font-medium text-[64px] md:text-[96px] leading-[0.9] tracking-[-0.04em] mb-6">
          {t('home.welcome')}
        </h1>
        <p className="text-[var(--t-3)] max-w-xl text-lg leading-relaxed">{t('home.subtitle')}</p>
      </section>

      {/* Bento grid */}
      <section className="grid grid-cols-12 gap-4 md:gap-5">
        <div className="bx-card col-span-12 md:col-span-7 p-7 min-h-[280px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bx-dot" />
              <span className="bx-eyebrow text-[var(--coral-2)]">LIVE · QF · BO3</span>
            </div>
            <p className="bx-eyebrow mb-2">DEMO MATCH</p>
            <div className="flex items-end gap-6 mb-2">
              <div>
                <div className="font-display font-medium text-2xl">Sandstorm</div>
                <div className="bx-eyebrow mt-1">KW · 1842</div>
              </div>
              <div className="bx-num text-[64px]" style={{ color: 'var(--t-1)' }}>
                13
              </div>
              <div className="bx-num text-[32px]" style={{ color: 'var(--t-4)' }}>
                :
              </div>
              <div className="bx-num text-[64px]" style={{ color: 'rgba(255,255,255,.55)' }}>
                11
              </div>
              <div>
                <div className="font-display font-medium text-2xl">Falcon Squad</div>
                <div className="bx-eyebrow mt-1">KW · 1761</div>
              </div>
            </div>
          </div>
          <p className="bx-eyebrow text-[var(--t-4)]">
            MIRAGE · ROUND 24 · KEC SPRING&nbsp;&apos;26
          </p>
        </div>

        <div className="bx-card col-span-12 md:col-span-5 p-7">
          <p className="bx-eyebrow mb-4">PRIZE POOL · KEC SPRING</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-base text-[var(--t-3)]">KWD</span>
            <span className="bx-num text-[72px]">25K</span>
          </div>
          <p className="text-[var(--t-3)] text-sm leading-relaxed">
            Sponsor-funded by Zain Kuwait. Distributed to top 8 teams via Tap Payments.
          </p>
        </div>

        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">PLAYERS</p>
          <p className="bx-num text-[44px] mb-1">10,247</p>
          <p className="text-xs text-[var(--lime)]">+12% W/W</p>
        </div>
        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">TEAMS</p>
          <p className="bx-num text-[44px] mb-1">1,082</p>
          <p className="text-xs text-[var(--lime)]">+8% W/W</p>
        </div>
        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">VENUES</p>
          <p className="bx-num text-[44px] mb-1">23</p>
          <p className="text-xs text-[var(--t-4)]">across GCC</p>
        </div>
        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">MATCHES / WK</p>
          <p className="bx-num text-[44px] mb-1">412</p>
          <p className="text-xs text-[var(--lime)]">North star ↗</p>
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--t-4)]">
        <span className="font-mono tracking-widest uppercase">
          beat&apos;em all · {t('app.tagline')}
        </span>
        <span className="font-mono">v0.0.1 · localhost</span>
      </footer>
    </main>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-[10px] grid place-items-center font-display font-bold text-base"
        style={{
          background: 'linear-gradient(135deg, var(--violet) 0%, var(--violet-deep) 100%)',
          boxShadow: 'var(--sh-glow)',
        }}
      >
        Bx
      </div>
      <span className="font-display font-medium text-lg tracking-tight">Beat&apos;Em All</span>
    </div>
  );
}
