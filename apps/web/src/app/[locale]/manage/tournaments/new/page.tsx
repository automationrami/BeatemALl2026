import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { EmptyState, PageHead, buttonClass } from '@beat-em-all/ui';
import {
  listMyOrganizations,
  listTournamentGames,
  listTournamentOrganizations,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { TournamentForm } from '@/components/tournament-admin/TournamentForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

/** M-02: create a draft tournament for one of the viewer's verified organisations. */
export default async function NewTournamentPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('tournamentAdmin');

  const me = await getCurrentUser();
  const [orgs, games, mine] = await Promise.all([
    listTournamentOrganizations(me.userId),
    listTournamentGames(),
    listMyOrganizations(me.userId),
  ]);
  const pending = mine.filter((o) => o.verificationStatus === 'pending');

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/manage`}
          className="bx-label inline-flex items-center gap-2 justify-self-start text-ink-muted no-underline hover:text-ink"
        >
          <ArrowLeft className="bx-icon bx-flip" aria-hidden />
          {t('backToManage')}
        </Link>

        <PageHead
          eyebrow={[t('newEyebrow')]}
          title={t('newTitle')}
          description={t('newDescription')}
        />
      </div>

      {orgs.length === 0 ? (
        <div data-testid="tournament-no-org">
          <EmptyState
            title={pending.length > 0 ? t('pendingOrgTitle') : t('noOrgTitle')}
            body={
              pending.length > 0
                ? t('pendingOrgBody', { name: pending.map((o) => o.name).join(', ') })
                : t('noOrgBody')
            }
            action={
              pending.length > 0 ? undefined : (
                <Link
                  href={`/${locale}/organizers/apply`}
                  className={buttonClass('gold')}
                  data-testid="tournament-apply-link"
                >
                  <Building2 className="bx-icon" aria-hidden />
                  {t('applyCta')}
                </Link>
              )
            }
          />
        </div>
      ) : (
        <TournamentForm
          mode="create"
          organizations={orgs.map((o) => ({ slug: o.slug, name: o.name, tier: o.tier }))}
          games={games}
        />
      )}
    </main>
  );
}
