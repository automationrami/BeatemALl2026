import { setRequestLocale } from 'next-intl/server';
import { OnboardingForm } from '@/components/OnboardingForm';
import { Wordmark } from '@beat-em-all/ui';
import { LanguageToggle } from '@/components/LanguageToggle';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-12">
        <Wordmark />
        <LanguageToggle />
      </header>
      <div className="max-w-2xl mx-auto">
        <OnboardingForm />
      </div>
    </main>
  );
}
