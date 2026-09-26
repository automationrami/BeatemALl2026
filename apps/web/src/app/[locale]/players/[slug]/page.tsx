import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { listPlayerTeams, loadPlayerProfileBySlug } from '@beat-em-all/db/queries';
import { PlayerProfileBySlug } from '@/components/PlayerProfileBySlug';
import { PlayerTeams } from '@/components/player/PlayerTeams';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PlayerSlugPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Identity, bio, city and games come from Postgres (P-05); pentagon, stats and recent
  // matches are still a mock overlay until match history is modelled.
  const profile = await loadPlayerProfileBySlug(slug);
  if (!profile) notFound();

  const [teams, me, t] = await Promise.all([
    listPlayerTeams(profile.slug),
    getCurrentUser().catch(() => null),
    getTranslations('profile'),
  ]);

  return (
    <main className="bx-page">
      <PlayerProfileBySlug profile={profile} isSelf={me?.playerSlug === profile.slug} />
      <PlayerTeams locale={locale} teams={teams} emptyText={t('noTeams')} />
    </main>
  );
}
