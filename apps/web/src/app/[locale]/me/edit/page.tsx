import { setRequestLocale, getTranslations } from 'next-intl/server';
import { EmptyState, PageHead } from '@beat-em-all/ui';
import { listGamesForCreateTeam, loadEditableProfile } from '@beat-em-all/db/queries';
import { GAMES } from '@beat-em-all/mock-data';
import type { GameId } from '@beat-em-all/types';
import { ProfileEditForm } from '@/components/player/ProfileEditForm';
import { countryOptions, requireMe } from '@/components/player/me-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

/** P-04: edit my profile. */
export default async function EditProfilePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await requireMe(locale);
  const [t, profile, games] = await Promise.all([
    getTranslations('profileEdit'),
    loadEditableProfile(me.playerId),
    listGamesForCreateTeam(me.playerId),
  ]);

  return (
    <main className="bx-page">
      <PageHead eyebrow={[t('eyebrow')]} title={t('title')} description={t('subtitle')} />
      {profile ? (
        <ProfileEditForm
          locale={locale}
          playerSlug={profile.playerSlug}
          countries={countryOptions(locale, profile.countryCode)}
          games={games.map((g) => ({
            slug: g.slug,
            name: g.name,
            shortName: GAMES[g.slug as GameId]?.shortName,
            brandColor: GAMES[g.slug as GameId]?.brandColor,
          }))}
          initial={{
            displayName: profile.displayName,
            bio: profile.bio,
            city: profile.city,
            countryCode: profile.countryCode,
            isOpenToTeamInvites: profile.isOpenToTeamInvites,
            gameSlugs: profile.gameSlugs,
          }}
        />
      ) : (
        <EmptyState title={t('notFound')} />
      )}
    </main>
  );
}
