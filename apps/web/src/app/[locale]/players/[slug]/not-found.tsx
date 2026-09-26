import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { House } from 'lucide-react';
import { buttonClass } from '@beat-em-all/ui';

/**
 * Rendered by `notFound()` in the sibling page. Next passes no params to not-found
 * files, so the locale comes from the request (set by the [locale] layout). Calling
 * `setRequestLocale` here with a fallback would override it and turn /ar pages English.
 */
export default async function PlayerNotFound() {
  const locale = await getLocale();
  const t = await getTranslations('playerNotFound');

  return (
    <main className="bx-page">
      <section className="bx-card mx-auto grid w-full max-w-xl justify-items-center gap-4 p-8 text-center md:p-12">
        <p className="bx-eyebrow text-gold-text">404</p>
        <h1 className="bx-display">{t('title')}</h1>
        <p className="max-w-[46ch] text-[15px] text-ink-muted">{t('body')}</p>
        <Link href={`/${locale}`} className={buttonClass('gold')}>
          <House className="bx-icon" aria-hidden />
          {t('backHome')}
        </Link>
      </section>
    </main>
  );
}
