import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Wordmark } from '@beat-em-all/ui';
import { getPlayerProfileForSlug } from '@beat-em-all/api-client';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { PlayerProfileBySlug } from '@/components/PlayerProfileBySlug';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PlayerSlugPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const profile = getPlayerProfileForSlug(slug);
  if (!profile) notFound();
  await getTranslations('profile'); // primes the locale

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
      <PlayerProfileBySlug slug={slug} />
    </main>
  );
}
