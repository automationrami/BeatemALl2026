import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@beat-em-all/ui';
import { ButtonLink } from '@/components/tournament/ButtonLink';

export default function TournamentNotFound() {
  const t = useTranslations('tournament');
  const locale = useLocale();
  return (
    <main className="bx-page">
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <ButtonLink href={`/${locale}/tournaments`} variant="gold">
            <ArrowLeft className="bx-icon bx-flip" aria-hidden />
            {t('backToList')}
          </ButtonLink>
        }
      />
    </main>
  );
}
