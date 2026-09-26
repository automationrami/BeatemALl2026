import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PageHead, StatStrip, Tag, Wordmark } from '@beat-em-all/ui';

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
    <main className="bx-page">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wordmark size={36} />
          <Tag tone="org">KEC Tournament Ops</Tag>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <PageHead
        eyebrow={['Admin console', 'Phase 1 · mock data']}
        title={`${t('app.name')} · Admin`}
        description="Tournament management, organisation administration, venue verification, dispute resolution, payouts."
      >
        <StatStrip
          bordered
          items={[
            { label: "Active organisations · KEC, Beat'Em All, DXE Fuel", value: 3, tone: 'gold' },
            { label: 'Pending disputes · all clear', value: 0 },
            { label: 'Venues awaiting verification', value: 2 },
            { label: 'Civil ID reviews pending', value: 7 },
            { label: 'Payouts queued', value: 1 },
            { label: 'Feature flags', value: 12 },
          ]}
        />
      </PageHead>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-6">
        <span className="bx-eyebrow">{t('app.tagline')}</span>
        <span className="bx-eyebrow">v0.0.1 · localhost:3001</span>
      </footer>
    </main>
  );
}
