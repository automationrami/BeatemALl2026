import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  listMyInvitations,
  listPlayerTeams,
  loadPlayerProfileBySlug,
  teamAccentColor,
} from '@beat-em-all/db/queries';
import { SectionTitle } from '@beat-em-all/ui';
import { PlayerProfileViewFor } from '@/components/PlayerProfileView';
import { InvitationsPanel } from '@/components/player/InvitationsPanel';
import { PlayerTeams } from '@/components/player/PlayerTeams';
import { requireMe } from '@/components/player/me-server';
import { dateLocale } from '@/components/booking/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string }>;
};

/** My profile: the public view of me, plus my open team invitations and my teams. */
export default async function MePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await requireMe(locale);
  const [profile, invitations, teams, t, tp] = await Promise.all([
    loadPlayerProfileBySlug(me.playerSlug),
    listMyInvitations(me.playerId),
    listPlayerTeams(me.playerSlug),
    getTranslations('invitations'),
    getTranslations('profile'),
  ]);
  if (!profile) notFound();

  const date = new Intl.DateTimeFormat(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kuwait',
  });

  // `/me#invitations` is the deep link from the invite notification: the section is always
  // rendered — at the top while there's something to answer, otherwise at the bottom.
  const invitationsSection = (
    <section
      id="invitations"
      className="bx-stack min-w-0 scroll-mt-24"
      aria-labelledby="invitations-title"
      data-testid="invitations"
    >
      <SectionTitle
        id="invitations-title"
        title={t('title')}
        eyebrow={invitations.length > 0 ? t('count', { count: invitations.length }) : undefined}
      />
      <InvitationsPanel
        locale={locale}
        invitations={invitations.map((i) => ({
          teamSlug: i.teamSlug,
          teamName: i.teamName,
          teamTag: i.teamTag,
          accentColor: teamAccentColor(i.teamSlug, []),
          expiresLabel: date.format(i.expiresAt),
          invitedByName: i.invitedByName,
        }))}
      />
    </section>
  );

  return (
    <main className="bx-page">
      {invitations.length > 0 ? invitationsSection : null}
      <PlayerProfileViewFor profile={profile} isSelf />
      <PlayerTeams locale={locale} teams={teams} emptyText={tp('noTeamsSelf')} />
      {invitations.length === 0 ? invitationsSection : null}
    </main>
  );
}
