import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { EmptyState, buttonClass } from '@beat-em-all/ui';

export default function VenueNotFound() {
  const t = useTranslations('venue');
  const locale = useLocale();
  return (
    <main className="bx-page">
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link href={`/${locale}/venues`} className={buttonClass('ink', 'sm')}>
            <ArrowLeft className="bx-icon bx-flip size-4" aria-hidden />
            {t('backToVenues')}
          </Link>
        }
      />
    </main>
  );
}
