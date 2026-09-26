import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { loadPlayerProfileBySlug } from '@beat-em-all/db/queries';
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
    <main className="bx-page">
      <PlayerProfileBySlug profile={profile} />
    </main>
  );
}
