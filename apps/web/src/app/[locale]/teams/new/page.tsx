import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHead } from '@beat-em-all/ui';
import { listGamesForCreateTeam } from '@beat-em-all/db/queries';
import { GAMES } from '@beat-em-all/mock-data';
import type { GameId } from '@beat-em-all/types';
import { CreateTeamForm } from '@/components/team/CreateTeamForm';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function CreateTeamPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const games = await listGamesForCreateTeam(me.playerId);
  const t = await getTranslations('teamCreate');

  // Pre-fill country from the active persona's primary team if any (rare here since
  // this page is mostly used by team-less personas), else default to KW.
  const defaultCountry = 'KW';

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('eyebrow')]}
        title={t('title')}
        description={t('subtitle', { displayName: me.displayName })}
      />

      <CreateTeamForm
        locale={locale}
        defaultCountry={defaultCountry}
        games={games.map((g) => ({
          ...g,
          shortName: GAMES[g.slug as GameId]?.shortName,
          brandColor: GAMES[g.slug as GameId]?.brandColor,
        }))}
        viewerHasTeam={me.teamMemberships.length > 0}
      />
    </main>
  );
}
