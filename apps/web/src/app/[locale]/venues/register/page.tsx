import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Notice, PageHead } from '@beat-em-all/ui';
import { listVenueGameOptions } from '@beat-em-all/db/queries';
import { VenueForm } from '@/components/venue-owner/VenueForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

/** V-01: a venue owner applies to list their venue. Beat'Em All reviews it before it goes live. */
export default async function RegisterVenuePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('venueOwner');
  const gameOptions = await listVenueGameOptions();

  return (
    <main className="bx-page">
      <Link
        href={`/${locale}/venues`}
        className="bx-eyebrow inline-flex items-center gap-1.5 justify-self-start hover:text-ink"
      >
        <ArrowLeft className="bx-icon bx-flip size-3.5" aria-hidden />
        {t('register.back')}
      </Link>
      <PageHead
        eyebrow={[t('register.eyebrow')]}
        title={t('register.title')}
        description={t('register.description')}
      />
      <Notice icon={<ShieldCheck className="bx-icon" aria-hidden />}>
        {t('register.reviewNote')}
      </Notice>
      <VenueForm mode="register" gameOptions={gameOptions} />
    </main>
  );
}
