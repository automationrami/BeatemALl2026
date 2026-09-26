import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';
import { PageHead, SectionTitle, Tag } from '@beat-em-all/ui';
import { listMyOrganizations, type MyOrganization } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { OrgApplyForm } from '@/components/organizer/OrgApplyForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

const STATUS_TONE: Record<MyOrganization['verificationStatus'], 'gold' | 'soft' | 'neutral'> = {
  verified: 'gold',
  pending: 'soft',
  unverified: 'neutral',
  rejected: 'neutral',
  suspended: 'neutral',
};

/** M-01: apply for an organiser (community / brand) account; shows existing applications. */
export default async function OrganizerApplyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('organizer');

  const me = await getCurrentUser();
  const mine = await listMyOrganizations(me.userId);

  return (
    <main className="bx-page">
      <PageHead eyebrow={[t('eyebrow')]} title={t('title')} description={t('description')} />

      {mine.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="my-orgs-title">
          <SectionTitle id="my-orgs-title" title={t('myTitle')} />
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="org-apply-mine">
            {mine.map((o) => (
              <li
                key={o.id}
                className="bx-card bx-card--flat grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3"
                data-testid={`org-status-${o.slug}`}
              >
                <Building2 className="bx-icon text-ink-muted" aria-hidden />
                <div className="grid min-w-0 gap-1">
                  <span className="truncate font-display text-[16px] font-bold text-ink">
                    {o.name}
                  </span>
                  <span className="text-[13px] text-ink-muted">
                    {t(`tier.${o.tier}`)} · {t(`role.${o.role}`)}
                  </span>
                  {o.verificationStatus === 'rejected' && o.reviewNotes ? (
                    <span className="text-[13px] text-negative">
                      {t('rejectedReason', { reason: o.reviewNotes })}
                    </span>
                  ) : null}
                </div>
                {o.verificationStatus === 'verified' ? (
                  <Link
                    href={`/${locale}/manage`}
                    className="bx-label inline-flex items-center gap-1 text-gold-text no-underline"
                  >
                    {t('manageCta')}
                    <ChevronRight className="bx-icon bx-flip" aria-hidden />
                  </Link>
                ) : (
                  <Tag tone={STATUS_TONE[o.verificationStatus]}>
                    {t(`status.${o.verificationStatus}`)}
                  </Tag>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <OrgApplyForm />
    </main>
  );
}
