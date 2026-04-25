import { setRequestLocale } from 'next-intl/server';
import { Wordmark } from '@beat-em-all/ui';
import { CallbackRedirect } from '@/components/CallbackRedirect';
import { useTranslations } from 'next-intl';

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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-8 gap-6">
      <Wordmark showLabel={false} size={48} />
      <div
        className="w-32 h-[3px] rounded-[2px] overflow-hidden relative"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        aria-hidden
      >
        <div
          className="absolute h-full w-2/5"
          style={{
            background: 'linear-gradient(90deg, transparent, #A78BFA, transparent)',
            animation: 'bxSlide 1.4s infinite ease-in-out',
          }}
        />
      </div>
      <div className="text-center">
        <p className="bx-eyebrow">{t('eyebrow')}</p>
        <p className="font-display font-medium text-lg mt-2">{t('title')}</p>
        <p className="font-display text-xs text-[var(--t-4)] mt-1.5">{t('subtitle')}</p>
      </div>
      <CallbackRedirect />
    </main>
  );
}
