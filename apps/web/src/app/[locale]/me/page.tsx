import { setRequestLocale } from 'next-intl/server';
import { Wordmark } from '@beat-em-all/ui';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { PlayerProfileView } from '@/components/PlayerProfileView';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-10">
        <Wordmark />
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>
      <PlayerProfileView />
    </main>
  );
}
