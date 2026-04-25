'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, OtpInput, useHasMounted } from '@beat-em-all/ui';
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
      className="flex flex-col"
    >
      <button
        type="button"
        onClick={() => router.push(`/${locale}/sign-in`)}
        className="font-mono text-[12px] text-[var(--t-3)] mb-9 self-start hover:text-white transition-colors"
      >
        ← {t('back')}
      </button>

      <p className="bx-eyebrow mb-2.5">{t('eyebrow')}</p>
      <h1 className="font-display font-medium text-[36px] leading-[1] tracking-[-0.035em] mb-2.5">
        {t('title')}
      </h1>
      <p className="font-display text-[14px] text-[var(--t-3)] mb-8">
        {t('subtitlePrefix')} <span className="text-white font-mono">{maskedPhone}</span>
      </p>

      <OtpInput
        value={code}
        onChange={setCode}
        autoFocus
        invalid={!!error}
        onComplete={(c) => handleVerify(c)}
      />

      {error && <p className="mt-3 text-[12px] font-display text-[var(--coral-2)]">{error}</p>}

      <div className="mt-6">
        <Button tone="primary" size="lg" full type="submit" disabled={pending || code.length !== 6}>
          {t('verifyCta')} →
        </Button>
      </div>

      <p className="mt-6 text-center font-display text-[12px] text-[var(--t-3)]">
        {secondsUntilResend > 0 ? (
          <span className="text-[var(--t-4)]">
            {t('resendIn', { seconds: secondsUntilResend })}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setSecondsUntilResend(RESEND_SECONDS)}
            className="underline hover:text-white"
          >
            {t('resendNow')}
          </button>
        )}
      </p>

      <div className="mt-auto pt-8">
        <div className="flex gap-2.5 p-3.5 rounded-xl bg-[rgba(251,113,133,0.08)] border border-[rgba(251,113,133,0.2)]">
          <span className="bx-dot mt-1.5 flex-shrink-0" />
          <p className="font-display text-[11px] text-[var(--t-2)] leading-[1.5]">
            <strong className="text-[var(--coral-2)] me-1">
              {t('lockoutWarning', { remaining: attemptsLeft })}
            </strong>
          </p>
        </div>
      </div>
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
