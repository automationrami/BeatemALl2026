import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Building2, ChevronRight, Landmark, Plus, ShieldCheck, Trophy } from 'lucide-react';
import { EmptyState, PageHead, SectionTitle, Tag, buttonClass } from '@beat-em-all/ui';
import { isPlatformAdmin, loadManageHub } from '@beat-em-all/db/queries';
import { getViewer } from '@/lib/current-user';
import { dateLocale } from '@/components/booking/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

const STATUS_TONE: Record<string, 'soft' | 'neutral' | 'live' | 'gold'> = {
  verified: 'soft',
  pending: 'neutral',
  rejected: 'live',
  suspended: 'live',
  unverified: 'neutral',
};

/**
 * One place for everything a user runs: their organisations (with review status), venues and
 * tournaments, plus the ways in — register a venue, apply as an organiser, create a tournament.
 */
export default async function ManageHubPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('manage');
  const viewer = await getViewer();
  const hub = viewer
    ? await loadManageHub(viewer.userId)
    : { organizations: [], venues: [], tournaments: [] };
  const admin = viewer ? await isPlatformAdmin(viewer.userId) : false;
  const canCreateTournament = hub.organizations.some(
    (o) =>
      o.status === 'verified' &&
      ['owner', 'admin', 'organizer'].includes(o.role) &&
      o.tier !== 'venue',
  );
  const date = new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: 'medium',
    timeZone: 'Asia/Kuwait',
  });
  const statusLabel = (s: string) => (t.has(`status.${s}`) ? t(`status.${s}`) : s);

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('eyebrow')]}
        title={t('title')}
        description={t('description')}
        aside={
          admin ? (
            <Link
              href={`/${locale}/admin`}
              className={buttonClass('ink', 'sm')}
              data-testid="manage-admin-link"
            >
              <ShieldCheck className="bx-icon" aria-hidden />
              {t('adminLink')}
            </Link>
          ) : undefined
        }
      />

      <section className="grid gap-4 min-[800px]:grid-cols-3" aria-label={t('startTitle')}>
        <Link
          href={`/${locale}/venues/register`}
          className="bx-card grid content-start gap-2 p-5 hover:bg-surface-200"
          data-testid="manage-register-venue"
        >
          <Building2 className="bx-icon size-6 text-gold-text" aria-hidden />
          <b className="font-display text-[18px] text-ink">{t('registerVenue')}</b>
          <span className="text-[14px] text-ink-muted">{t('registerVenueHint')}</span>
        </Link>
        <Link
          href={`/${locale}/organizers/apply`}
          className="bx-card grid content-start gap-2 p-5 hover:bg-surface-200"
          data-testid="manage-apply-organizer"
        >
          <Landmark className="bx-icon size-6 text-gold-text" aria-hidden />
          <b className="font-display text-[18px] text-ink">{t('applyOrganizer')}</b>
          <span className="text-[14px] text-ink-muted">{t('applyOrganizerHint')}</span>
        </Link>
        {canCreateTournament ? (
          <Link
            href={`/${locale}/manage/tournaments/new`}
            className="bx-card grid content-start gap-2 p-5 hover:bg-surface-200"
            data-testid="manage-create-tournament"
          >
            <Plus className="bx-icon size-6 text-gold-text" aria-hidden />
            <b className="font-display text-[18px] text-ink">{t('createTournament')}</b>
            <span className="text-[14px] text-ink-muted">{t('createTournamentHint')}</span>
          </Link>
        ) : (
          <div className="bx-card bx-card--flat grid content-start gap-2 p-5 opacity-80">
            <Trophy className="bx-icon size-6 text-ink-muted" aria-hidden />
            <b className="font-display text-[18px] text-ink">{t('createTournament')}</b>
            <span className="text-[14px] text-ink-muted">{t('createTournamentLocked')}</span>
          </div>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="manage-orgs">
        <SectionTitle id="manage-orgs" title={t('organizationsTitle')} />
        {hub.organizations.length === 0 ? (
          <EmptyState title={t('organizationsEmpty')} />
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="manage-organizations">
            {hub.organizations.map((o) => (
              <li
                key={o.id}
                className="bx-card bx-card--flat grid gap-1 px-4 py-3"
                data-org={o.slug}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-display text-[16px] text-ink">{o.name}</b>
                  <Tag>{t.has(`tier.${o.tier}`) ? t(`tier.${o.tier}`) : o.tier}</Tag>
                  <Tag tone={STATUS_TONE[o.status] ?? 'neutral'}>{statusLabel(o.status)}</Tag>
                  <span className="bx-eyebrow ms-auto">
                    {t.has(`role.${o.role}`) ? t(`role.${o.role}`) : o.role}
                  </span>
                </div>
                {o.status === 'rejected' && o.reviewNotes ? (
                  <p className="m-0 text-[13px] text-negative">
                    {t('rejectedReason', { reason: o.reviewNotes })}
                  </p>
                ) : null}
                {o.status === 'pending' ? (
                  <p className="m-0 text-[13px] text-ink-muted">{t('pendingHint')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {hub.venues.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="manage-venues">
          <SectionTitle id="manage-venues" title={t('venuesTitle')} />
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="manage-venues">
            {hub.venues.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/${locale}/manage/venues/${v.slug}`}
                  className="bx-card bx-card--flat flex items-center gap-3 px-4 py-3 hover:bg-surface-200"
                  data-venue={v.slug}
                >
                  <span className="grid min-w-0 gap-1">
                    <b className="font-display text-[16px] text-ink">{v.name}</b>
                    <span className="text-[13px] text-ink-muted">{v.city}</span>
                  </span>
                  <Tag tone={STATUS_TONE[v.status] ?? 'neutral'} className="ms-auto">
                    {statusLabel(v.status)}
                  </Tag>
                  <ChevronRight className="bx-icon bx-flip text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hub.tournaments.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="manage-tournaments">
          <SectionTitle id="manage-tournaments" title={t('tournamentsTitle')} />
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="manage-tournaments">
            {hub.tournaments.map((tr) => (
              <li key={tr.slug}>
                <Link
                  href={`/${locale}/manage/tournaments/${tr.slug}`}
                  className="bx-card bx-card--flat flex items-center gap-3 px-4 py-3 hover:bg-surface-200"
                  data-tournament={tr.slug}
                >
                  <span className="grid min-w-0 gap-1">
                    <b className="font-display text-[16px] text-ink">{tr.name}</b>
                    <span className="text-[13px] text-ink-muted">
                      {tr.game}
                      {tr.startsAt ? ` · ${date.format(tr.startsAt)}` : ''} ·{' '}
                      {t('entries', { count: tr.entries, max: tr.maxTeams })}
                    </span>
                  </span>
                  <Tag className="ms-auto">
                    {t.has(`tournamentStatus.${tr.status}`)
                      ? t(`tournamentStatus.${tr.status}`)
                      : tr.status}
                  </Tag>
                  <ChevronRight className="bx-icon bx-flip text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
