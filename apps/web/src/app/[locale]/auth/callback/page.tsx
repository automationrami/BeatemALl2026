import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { CallbackRedirect } from '@/components/CallbackRedirect';
import { AuthLayout } from '@/components/auth/AuthLayout';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AuthCallbackPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CallbackContent />;
}

function CallbackContent() {
  const t = useTranslations('callback');
  return (
    <AuthLayout>
      <div className="grid justify-items-center gap-6 text-center" role="status" aria-live="polite">
        <div className="relative h-1 w-40 overflow-hidden rounded-chip bg-surface-300" aria-hidden>
          <div className="absolute inset-y-0 w-2/5 rounded-chip bg-[image:var(--gradient-gold)] animate-[bxSlide_1.4s_ease-in-out_infinite]" />
        </div>
        <div className="grid gap-2">
          <p className="bx-eyebrow">{t('eyebrow')}</p>
          <p className="bx-display">{t('title')}</p>
          <p className="text-[15px] font-medium text-ink-muted">{t('subtitle')}</p>
        </div>
      </div>
      <CallbackRedirect />
    </AuthLayout>
  );
}
