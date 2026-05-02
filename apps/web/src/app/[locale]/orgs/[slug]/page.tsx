import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { loadOrganizationBySlug } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default async function OrgDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const org = await loadOrganizationBySlug(slug);
  if (!org) notFound();

  const t = await getTranslations('organization');

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

  const accent = org.accentColor ?? '#A78BFA';

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-10">
        <Link href={`/${locale}`}>
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <section
        className="rounded-[20px] p-7 mb-4"
        style={{
          background: `radial-gradient(120% 80% at 100% 0%, ${accent}33, transparent 55%), linear-gradient(180deg,#16131F,#0F1015)`,
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-7 items-start">
          <span
            className="w-[120px] h-[120px] rounded-2xl shrink-0 grid place-items-center font-display font-bold text-white text-[36px]"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}55)`,
              border: '1px solid rgba(255,255,255,0.10)',
            }}
            aria-hidden
          >
            {org.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="bx-eyebrow mb-2">
              ORG · {tierLabel.toUpperCase()} · {org.countryCode}
            </p>
            <h1 className="font-display font-medium text-[44px] md:text-[56px] leading-[0.95] tracking-[-0.035em] mb-3">
              {org.name}
            </h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <Pill tone="violet">{tierLabel}</Pill>
              {org.verificationStatus === 'verified' ? (
                <Pill tone="cyan" dot>
                  {t('verified')}
                </Pill>
              ) : null}
            </div>
            {org.description ? (
              <p className="text-[var(--t-3)] max-w-2xl text-base leading-relaxed">
                {org.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {org.websiteUrl || org.contactEmail ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {org.websiteUrl ? (
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
              <p className="bx-eyebrow mb-2">{t('websiteLabel')}</p>
              <a
                href={org.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display font-medium text-[16px] text-[var(--cyan-2)] hover:underline break-all"
              >
                {org.websiteUrl}
              </a>
            </div>
          ) : null}
          {org.contactEmail ? (
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
              <p className="bx-eyebrow mb-2">{t('contactLabel')}</p>
              <a
                href={`mailto:${org.contactEmail}`}
                className="font-display font-medium text-[16px] text-[var(--cyan-2)] hover:underline break-all"
              >
                {org.contactEmail}
              </a>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
