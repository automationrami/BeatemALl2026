import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { EmptyState, buttonClass } from '@beat-em-all/ui';

/** Fallback 404 for every localised route without its own not-found page. */
export default function LocaleNotFound() {
  const t = useTranslations('app');
  const locale = useLocale();
  return (
    <main className="bx-page">
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link href={`/${locale}`} className={buttonClass('ink', 'sm')}>
            <ArrowLeft className="bx-icon bx-flip size-4" aria-hidden />
            {t('backHome')}
          </Link>
        }
      />
    </main>
  );
}
