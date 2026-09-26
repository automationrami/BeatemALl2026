import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { EmptyState, buttonClass } from '@beat-em-all/ui';

export default function OrgNotFound() {
  const t = useTranslations('organization');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  return (
    <main className="bx-page">
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link href={`/${locale}`} className={buttonClass('ink')}>
            <ChevronLeft className="bx-icon bx-flip" aria-hidden />
            {tNav('home')}
          </Link>
        }
      />
    </main>
  );
}
