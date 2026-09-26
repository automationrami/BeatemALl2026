'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import { Button, Notice, OtpInput, buttonClass, useHasMounted } from '@beat-em-all/ui';
import { useAuthDraft, verifyOtp } from '@beat-em-all/api-client';

const RESEND_SECONDS = 30;

export function VerifyForm() {
  const t = useTranslations('verify');
  const locale = useLocale() as 'en' | 'ar';
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const mounted = useHasMounted();
  const phone = useAuthDraft((s) => s.phone);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [secondsUntilResend, setSecondsUntilResend] = useState(RESEND_SECONDS);

  // Only redirect AFTER the persisted store has hydrated. Otherwise we'd race against
  // the Zustand persist middleware on first paint and bounce the user back to /sign-in.
  useEffect(() => {
    if (mounted && !phone) router.replace(`/${locale}/sign-in`);
  }, [mounted, phone, router, locale]);

  // Countdown for the resend button
  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const t = setTimeout(() => setSecondsUntilResend((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsUntilResend]);

  function handleVerify(maybeCode?: string) {
    const c = maybeCode ?? code;
    setError(null);
    const result = verifyOtp(c);
    if (!result.ok) {
      setAttemptsLeft((n) => Math.max(0, n - 1));
      setError(
        t(
          `errors.${result.error}` as
            | 'errors.invalid_code'
            | 'errors.expired_code'
            | 'errors.rate_limited',
        ),
      );
      return;
    }
    startTransition(() => router.push(`/${locale}/onboarding`));
  }

  // Render a stable placeholder until hydration finishes; prevents layout flicker.
  if (!mounted) {
    return <div className="min-h-[480px]" aria-hidden />;
  }
  if (!phone) return null;

  // Mask phone for display: +965 5•••• 4287
  const maskedPhone = maskPhone(phone);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleVerify();
      }}
      className="grid gap-6"
    >
      <button
        type="button"
        onClick={() => router.push(`/${locale}/sign-in`)}
        className={buttonClass('ghost', 'sm', false, 'justify-self-start -ms-3.5')}
      >
        <ChevronLeft className="bx-icon bx-flip" aria-hidden />
        {t('back')}
      </button>

      <div className="grid gap-2.5">
        <p className="bx-eyebrow">{t('eyebrow')}</p>
        <h1 className="bx-display">{t('title')}</h1>
        <p className="text-[15px] font-medium text-ink-muted">
          {t('subtitlePrefix')}{' '}
          <span className="bx-num text-ink" dir="ltr">
            {maskedPhone}
          </span>
        </p>
      </div>

      <div className="grid gap-3">
        <OtpInput
          value={code}
          onChange={setCode}
          autoFocus
          invalid={!!error}
          onComplete={(c) => handleVerify(c)}
        />
        {error && (
          <p className="text-[13px] font-medium text-negative" role="alert">
            {error}
          </p>
        )}
      </div>

      <Button variant="gold" size="lg" full type="submit" disabled={pending || code.length !== 6}>
        {t('verifyCta')}
        <ArrowRight className="bx-icon bx-flip" aria-hidden />
      </Button>

      <p className="text-center text-[13px] font-medium text-ink-muted">
        {secondsUntilResend > 0 ? (
          <span>{t('resendIn', { seconds: secondsUntilResend })}</span>
        ) : (
          <button
            type="button"
            onClick={() => setSecondsUntilResend(RESEND_SECONDS)}
            className="font-bold text-gold-text underline hover:text-gold-text-hi"
          >
            {t('resendNow')}
          </button>
        )}
      </p>

      <Notice tone="neutral" icon={<ShieldAlert className="bx-icon text-negative" aria-hidden />}>
        {t('lockoutWarning', { remaining: attemptsLeft })}
      </Notice>
    </form>
  );
}

function maskPhone(phone: string): string {
  // +96555504287 → +965 5•••• 4287 (keeps first digit + last 4)
  if (phone.length < 8) return phone;
  const cc = phone.slice(0, 4); // +965
  const first = phone.slice(4, 5);
  const last = phone.slice(-4);
  return `${cc} ${first}•••• ${last}`;
}
