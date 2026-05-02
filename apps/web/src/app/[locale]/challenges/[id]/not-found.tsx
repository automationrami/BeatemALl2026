import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Wordmark } from '@beat-em-all/ui';

export default function ChallengeNotFound() {
  const t = useTranslations('challenge');
  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12 grid place-items-center">
      <div className="max-w-md text-center">
        <Wordmark />
        <h1 className="font-display font-medium text-[40px] mt-8 mb-3">{t('notFoundTitle')}</h1>
        <p className="text-[var(--t-3)] text-base leading-relaxed mb-6">{t('notFoundBody')}</p>
        <Link href="/">
          <Button tone="primary" size="md">
            ← Home
          </Button>
        </Link>
      </div>
    </main>
  );
}
