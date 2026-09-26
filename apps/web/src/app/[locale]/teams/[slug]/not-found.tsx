import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonClass, EmptyState } from '@beat-em-all/ui';

/**
 * not-found boundaries receive no params, and Next renders this element on every request
 * to the segment. So it must not call `setRequestLocale` (a hard-coded fallback would switch
 * the whole request to English); it reads the locale the layout already set instead.
 */
export default async function TeamNotFound() {
  const locale = await getLocale();
  const t = await getTranslations('team');

  return (
    <main className="bx-page">
      <section className="bx-stack max-w-2xl">
        <p className="bx-eyebrow">404</p>
        <EmptyState
          title={t('notFoundTitle')}
          body={t('notFoundBody')}
          action={
            <Link href={`/${locale}`} className={buttonClass('gold')}>
              {t('notFoundCta')}
            </Link>
          }
        />
      </section>
    </main>
  );
}
