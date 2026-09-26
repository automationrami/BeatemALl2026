'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Props = {
  registrationId: string;
  locale: string;
  /** The entry was paid with a voucher; withdrawing gives it back. */
  paidWithVoucher?: boolean;
};

/**
 * Withdraw with an in-page confirm step (the browser's native confirm() is unstyled and
 * blocked in some in-app browsers).
 */
export function WithdrawRegistrationButton({ registrationId, paidWithVoucher }: Props) {
  const t = useTranslations('registration');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid justify-items-start gap-3">
      {confirming ? (
        <div
          className="bx-inset grid w-full gap-3 p-4"
          role="alertdialog"
          aria-labelledby="withdraw-confirm-text"
          data-testid="withdraw-confirm"
        >
          <p id="withdraw-confirm-text" className="m-0 text-[14px] leading-relaxed text-ink">
            {t('withdrawConfirm')}
            {paidWithVoucher ? ` ${t('refundNote')}` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={withdraw}
              disabled={submitting}
              data-testid="withdraw-confirm-yes"
            >
              <LogOut className="bx-icon bx-flip" aria-hidden />
              {submitting ? t('withdrawing') : t('withdrawConfirmYes')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              {t('withdrawConfirmNo')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" onClick={() => setConfirming(true)} data-testid="withdraw-cta">
          <LogOut className="bx-icon bx-flip" aria-hidden />
          {t('withdrawCta')}
        </Button>
      )}
      {error ? (
        <p className="m-0 text-[12px] leading-relaxed text-negative" role="alert">
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
