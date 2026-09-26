import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Globe, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { EmptyState, ProfileHeader, SectionTitle, Tag, TeamCrest } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import { listSurfaceableTournaments, loadOrganizationBySlug } from '@beat-em-all/db/queries';
import { OrgTournamentTile } from '@/components/org/OrgTournamentTile';

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/** Up to three initials from the organization name, e.g. "Kuwait Esports Club" → "KEC". */
function orgInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
    .filter(Boolean);
  return (letters.length > 1 ? letters.slice(0, 3).join('') : name.slice(0, 3)).toUpperCase();
}

function countryName(locale: string, code: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default async function OrgDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const org = await loadOrganizationBySlug(slug);
  if (!org) notFound();

  const t = await getTranslations('organization');
  const tTour = await getTranslations('tournament');

  // Open and upcoming events hosted by this organization (the public tournaments feed,
  // narrowed to this organizer).
  const tournaments = (await listSurfaceableTournaments()).filter((x) => x.organizer === org.name);

  const tierLabel =
    org.tier === 'federation'
      ? t('tierFederation')
      : org.tier === 'brand'
        ? t('tierBrand')
        : org.tier === 'venue'
          ? t('tierVenue')
          : org.tier === 'community'
            ? t('tierCommunity')
            : t('tierPersonal');

  const money = (amount: number) => t('prizeAmount', { amount: amount.toLocaleString('en-US') });
  const openCount = tournaments.filter((x) => x.status === 'registration_open').length;
  const prizeTotal = tournaments.reduce((sum, x) => sum + x.prizePoolKWD, 0);

  const statusOf = (status: string) =>
    status === 'registration_open'
      ? { label: tTour('registrationOpen'), tone: 'soft' as const }
      : status === 'in_progress'
        ? { label: tTour('inProgress'), tone: 'live' as const }
        : { label: t('statusUpcoming'), tone: 'neutral' as const };

  const meta: { icon?: React.ReactNode; text: React.ReactNode }[] = [
    {
      icon: <MapPin className="bx-icon" aria-hidden />,
      text: countryName(locale, org.countryCode),
    },
  ];
  if (org.websiteUrl) {
    meta.push({
      icon: <Globe className="bx-icon" aria-hidden />,
      text: (
        <a
          href={org.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink hover:text-gold-text hover:underline"
          aria-label={`${t('websiteLabel')}: ${org.websiteUrl}`}
        >
          {org.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      ),
    });
  }
  if (org.contactEmail) {
    meta.push({
      icon: <Mail className="bx-icon" aria-hidden />,
      text: (
        <a
          href={`mailto:${org.contactEmail}`}
          className="text-ink hover:text-gold-text hover:underline"
          aria-label={`${t('contactLabel')}: ${org.contactEmail}`}
        >
          {org.contactEmail}
        </a>
      ),
    });
  }

  return (
    <main className="bx-page">
      <ProfileHeader
        mark={
          <TeamCrest
            tag={orgInitials(org.name)}
            color={org.accentColor ?? undefined}
            src={org.logoUrl}
            size={120}
          />
        }
        tags={
          <>
            {org.verificationStatus === 'verified' ? (
              <Tag
                tone={org.tier === 'federation' ? 'org' : 'soft'}
                icon={<ShieldCheck className="bx-icon" aria-hidden />}
              >
                {t('verified')}
              </Tag>
            ) : null}
            <Tag tone="ink">{tierLabel}</Tag>
          </>
        }
        name={org.name}
        meta={meta}
        bio={org.description ?? undefined}
        stats={[
          { label: t('statTournaments'), value: tournaments.length },
          { label: t('statOpen'), value: openCount },
          { label: t('statPrizePool'), value: money(prizeTotal), tone: 'gold' },
        ]}
      />

      <section aria-labelledby="org-tournaments">
        <SectionTitle
          id="org-tournaments"
          eyebrow={t('tournamentsEyebrow')}
          title={t('tournamentsTitle')}
        />
        {tournaments.length === 0 ? (
          <EmptyState title={t('tournamentsEmpty')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {tournaments.map((tour) => (
              <OrgTournamentTile
                key={tour.id}
                href={`/${locale}/tournaments/${tour.slug}`}
                name={tour.name}
                game={GAMES[tour.game]?.title ?? tour.game}
                status={statusOf(tour.status)}
                sanctionedLabel={tour.isSanctioned ? tTour('sanctioned') : undefined}
                prize={tour.prizePoolKWD > 0 ? money(tour.prizePoolKWD) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
