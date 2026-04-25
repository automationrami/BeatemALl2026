import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { LanguageToggle } from '@/components/LanguageToggle';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminHome({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminContent />;
}

function AdminContent() {
  const t = useTranslations();

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[10px] grid place-items-center font-display font-bold text-base"
            style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
              boxShadow: 'var(--sh-glow)',
            }}
          >
            Bx
          </div>
          <div>
            <span className="font-display font-medium text-lg tracking-tight">
              Beat&apos;Em All · Admin
            </span>
            <p className="bx-eyebrow text-[var(--t-4)] mt-0.5">KEC TOURNAMENT OPS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <section className="mb-16">
        <p className="bx-eyebrow mb-6">PHASE 1 · ADMIN CONSOLE · MOCK DATA</p>
        <h1 className="font-display font-medium text-[64px] md:text-[88px] leading-[0.9] tracking-[-0.04em] mb-6">
          {t('app.name')}
          <br />
          <span style={{ color: 'var(--t-3)' }}>· Admin</span>
        </h1>
        <p className="text-[var(--t-3)] max-w-xl text-lg leading-relaxed">
          Tournament management, organisation administration, venue verification, dispute
          resolution, payouts.
        </p>
      </section>

      <section className="grid grid-cols-12 gap-4 md:gap-5">
        <div className="bx-card col-span-12 md:col-span-6 p-7">
          <p className="bx-eyebrow mb-4">ACTIVE ORGANISATIONS</p>
          <div className="flex items-baseline gap-3">
            <span className="bx-num text-[72px]">3</span>
            <span className="text-[var(--t-3)] text-sm">KEC · Beat&apos;Em All · DXE Fuel</span>
          </div>
        </div>
        <div className="bx-card col-span-12 md:col-span-6 p-7">
          <p className="bx-eyebrow mb-4">PENDING DISPUTES</p>
          <div className="flex items-baseline gap-3">
            <span className="bx-num text-[72px]">0</span>
            <span className="text-[var(--lime)] text-sm">All clear</span>
          </div>
        </div>

        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">VENUES · UNVERIFIED</p>
          <p className="bx-num text-[44px]">2</p>
        </div>
        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">CIVIL ID · PENDING</p>
          <p className="bx-num text-[44px]">7</p>
        </div>
        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">PAYOUTS · QUEUED</p>
          <p className="bx-num text-[44px]">1</p>
        </div>
        <div className="bx-card col-span-6 md:col-span-3 p-6">
          <p className="bx-eyebrow mb-3">FEATURE FLAGS</p>
          <p className="bx-num text-[44px]">12</p>
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--t-4)]">
        <span className="font-mono tracking-widest uppercase">
          beat&apos;em all admin · {t('app.tagline')}
        </span>
        <span className="font-mono">v0.0.1 · localhost:3001</span>
      </footer>
    </main>
  );
}
