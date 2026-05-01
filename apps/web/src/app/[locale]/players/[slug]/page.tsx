import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Wordmark } from '@beat-em-all/ui';
import { loadPlayerProfileBySlug } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { PlayerProfileBySlug } from '@/components/PlayerProfileBySlug';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PlayerSlugPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // DB-backed player profile (Phase 1 hybrid: real identity from Postgres + mock-data
  // fallback for rich fields not yet modelled — pentagon, stats, recent matches, etc.).
  const profile = await loadPlayerProfileBySlug(slug);
  if (!profile) notFound();

  await getTranslations('profile'); // primes the locale for the client subtree

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
      <PlayerProfileBySlug profile={profile} />
    </main>
  );
}
