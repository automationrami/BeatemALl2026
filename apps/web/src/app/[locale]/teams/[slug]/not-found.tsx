import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button, Wordmark } from '@beat-em-all/ui';
import { LanguageToggle } from '@/components/LanguageToggle';

type Props = {
  params?: Promise<{ locale: string }>;
};

export default async function TeamNotFound({ params }: Props) {
  const { locale = 'en' } = (await params) ?? {};
  setRequestLocale(locale);
  const t = await getTranslations('team');
  const tProfile = await getTranslations('profile');

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-16">
        <Link href={`/${locale}`}>
          <Wordmark />
        </Link>
        <LanguageToggle />
      </header>
      <section className="max-w-xl mx-auto text-center">
        <p className="bx-eyebrow mb-4 text-[var(--coral-2)]">404</p>
        <h1 className="font-display font-medium text-[48px] tracking-[-0.035em] mb-3">
          {t('notFoundTitle')}
        </h1>
        <p className="font-display text-[14px] text-[var(--t-3)] mb-7 leading-relaxed">
          {t('notFoundBody')}
        </p>
        <Link href={`/${locale}`}>
          <Button tone="primary" size="md">
            {tProfile('viewProfile')}
          </Button>
        </Link>
      </section>
    </main>
  );
}
