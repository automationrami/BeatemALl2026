import { setRequestLocale } from 'next-intl/server';
import { SignInForm } from '@/components/SignInForm';
import { Wordmark } from '@beat-em-all/ui';
import { LanguageToggle } from '@/components/LanguageToggle';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SignInPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-12">
        <Wordmark />
        <LanguageToggle />
      </header>
      <div className="max-w-md mx-auto">
        <SignInForm />
      </div>
    </main>
  );
}
