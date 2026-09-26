'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Ban, CircleCheck } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

/**
 * T-08: the booking team's captain cancels, with an in-page confirm step. Any voucher
 * payment goes back to the voucher; the venue is notified.
 */
export function TeamCancelBooking({
  bookingId,
  venueName,
  deadlineLabel,
}: {
  bookingId: string;
  venueName: string;
  /** Pre-formatted "free cancellation until …" line. */
  deadlineLabel: string;
}) {
  const t = useTranslations('venueOwner');
  const tb = useTranslations('booking');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: reason.trim() || null }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(tb, await readApiError(res), `HTTP ${res.status}`));
      }
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {!confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="danger"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            data-testid="booking-cancel"
          >
            <Ban className="bx-icon size-4" aria-hidden />
            {t('teamCancel.cta')}
          </Button>
          <span className="text-[13px] text-ink-muted" data-testid="booking-cancel-deadline">
            {deadlineLabel}
          </span>
        </div>
      ) : (
        <form className="bx-inset grid gap-3 p-4" onSubmit={cancel}>
          <p className="m-0 font-display text-[16px] font-bold text-ink">
            {t('teamCancel.confirmTitle')}
          </p>
          <p className="m-0 text-[13px] text-ink-muted">
            {t('teamCancel.confirmBody', { venue: venueName })}
          </p>
          <label className="bx-eyebrow" htmlFor="team-cancel-reason">
            {t('teamCancel.reasonLabel')}
          </label>
          <textarea
            id="team-cancel-reason"
            className="bx-field resize-y py-2.5"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            data-testid="booking-cancel-reason"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              disabled={busy}
              data-testid="booking-cancel-confirm"
            >
              <Ban className="bx-icon size-4" aria-hidden />
              {busy ? t('teamCancel.working') : t('teamCancel.confirm')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              <CircleCheck className="bx-icon size-4" aria-hidden />
              {t('teamCancel.keep')}
            </Button>
          </div>
        </form>
      )}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-3 py-2 font-display text-[13px] font-medium text-negative"
          data-testid="booking-cancel-error"
        >
          {t('teamCancel.errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
