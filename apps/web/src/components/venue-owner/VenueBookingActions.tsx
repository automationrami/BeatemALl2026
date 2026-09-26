'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Ban, CircleCheck, Flag, LogIn, UserX } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

export type VenueAction = 'check_in' | 'complete' | 'no_show' | 'cancel';

const ICONS: Record<VenueAction, React.ReactNode> = {
  check_in: <LogIn className="bx-icon size-4" aria-hidden />,
  complete: <Flag className="bx-icon size-4" aria-hidden />,
  no_show: <UserX className="bx-icon size-4" aria-hidden />,
  cancel: <Ban className="bx-icon size-4" aria-hidden />,
};

/**
 * The venue's buttons for one booking (V-05 / V-06): check in, complete, no-show, and cancel
 * with a reason (in-page confirm). `actions` comes from the server for the booking's status.
 */
export function VenueBookingActions({
  bookingId,
  actions,
  size = 'sm',
}: {
  bookingId: string;
  actions: VenueAction[];
  size?: 'sm' | 'md';
}) {
  const t = useTranslations('venueOwner');
  const router = useRouter();
  const [busy, setBusy] = useState<VenueAction | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (actions.length === 0) return null;

  const send = async (action: VenueAction) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/manage/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, reason: action === 'cancel' ? reason.trim() : null }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      }
      setCancelling(false);
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3">
      {!cancelling ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a}
              size={size}
              variant={
                a === 'check_in' || a === 'complete' ? 'ink' : a === 'cancel' ? 'danger' : 'outline'
              }
              disabled={busy !== null}
              onClick={() => {
                if (a === 'cancel') {
                  setError(null);
                  setCancelling(true);
                } else {
                  void send(a);
                }
              }}
              data-testid={`booking-action-${a}`}
            >
              {ICONS[a]}
              {busy === a ? t('actions.working') : t(`actions.${a}`)}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="bx-inset grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send('cancel');
          }}
        >
          <label className="bx-eyebrow" htmlFor={`cancel-reason-${bookingId}`}>
            {t('actions.reasonLabel')}
          </label>
          <textarea
            id={`cancel-reason-${bookingId}`}
            className="bx-field resize-y py-2.5"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('actions.reasonPlaceholder')}
            maxLength={500}
            required
            data-testid="booking-cancel-reason"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size={size}
              variant="danger"
              disabled={busy !== null || reason.trim().length === 0}
              data-testid="booking-cancel-confirm"
            >
              <Ban className="bx-icon size-4" aria-hidden />
              {busy === 'cancel' ? t('actions.working') : t('actions.confirmCancel')}
            </Button>
            <Button
              type="button"
              size={size}
              variant="ghost"
              disabled={busy !== null}
              onClick={() => setCancelling(false)}
            >
              <CircleCheck className="bx-icon size-4" aria-hidden />
              {t('actions.keep')}
            </Button>
          </div>
        </form>
      )}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-3 py-2 font-display text-[13px] font-medium text-negative"
          data-testid="booking-action-error"
        >
          {t('actions.errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
