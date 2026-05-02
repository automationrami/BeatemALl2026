'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';

type Props = {
  registrationId: string;
  locale: string;
};

export function WithdrawRegistrationButton({ registrationId }: Props) {
  const t = useTranslations('registration');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (submitting) return;
    if (!confirm(t('withdrawConfirm'))) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      <Button
        tone="ghost"
        size="sm"
        onClick={handleClick}
        disabled={submitting}
        data-testid="withdraw-cta"
      >
        {submitting ? '…' : t('withdrawCta')}
      </Button>
      {error ? (
        <p className="text-[var(--coral-2)] text-[12px] leading-relaxed">
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
