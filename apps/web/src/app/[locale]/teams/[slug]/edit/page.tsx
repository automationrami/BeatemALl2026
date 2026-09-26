import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Ban, Lock } from 'lucide-react';
import { EmptyState, Notice, PageHead, buttonClass } from '@beat-em-all/ui';
import { isTeamLeaderRole, loadTeamRole, loadTeamRowBySlug } from '@beat-em-all/db/queries';
import { DisbandTeam } from '@/components/team/DisbandTeam';
import { TeamEditForm } from '@/components/team/TeamEditForm';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/** T-05: captain / co-captain edit page; the captain also gets the disband control. */
export default async function EditTeamPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const team = await loadTeamRowBySlug(slug);
  if (!team) notFound();

  const [t, me] = await Promise.all([
    getTranslations('roster'),
    getCurrentUser().catch(() => null),
  ]);
  const role = me ? await loadTeamRole(me.playerId, team.id) : null;
  const teamHref = `/${locale}/teams/${team.slug}`;

  const back = (
    <Link href={teamHref} className={buttonClass('ghost')} data-testid="back-to-team">
      <ArrowLeft className="bx-icon bx-flip" aria-hidden />
      {t('backToTeam')}
    </Link>
  );

  return (
    <main className="bx-page">
      <PageHead eyebrow={[t('editEyebrow'), team.name]} title={t('editTitle')} aside={back} />

      {team.disbandedAt ? (
        <div data-testid="disbanded-notice">
          <Notice tone="neutral" icon={<Ban className="bx-icon" aria-hidden />}>
            {t('disbandedNoActions')}
          </Notice>
        </div>
      ) : !isTeamLeaderRole(role) ? (
        <EmptyState
          title={t('editForbiddenTitle')}
          body={t('editForbiddenBody')}
          action={
            <Link href={teamHref} className={buttonClass('ink')}>
              <Lock className="bx-icon" aria-hidden />
              {t('backToTeam')}
            </Link>
          }
        />
      ) : (
        <>
          <TeamEditForm
            teamSlug={team.slug}
            initial={{
              tag: team.tag,
              city: team.city ?? '',
              bio: team.bio ?? '',
              isRecruiting: team.isRecruiting,
            }}
          />
          {role === 'captain' ? (
            <DisbandTeam locale={locale} teamSlug={team.slug} teamName={team.name} />
          ) : null}
        </>
      )}
    </main>
  );
}
