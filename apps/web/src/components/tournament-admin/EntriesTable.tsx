'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ban, RotateCcw, UserCheck, UserMinus } from 'lucide-react';
import { Button, Tag, TeamCrest } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

const STATUS_KEY = {
  pending_payment: 'statusPendingPayment',
  confirmed: 'statusConfirmed',
  checked_in: 'statusCheckedIn',
  disqualified: 'statusDisqualified',
  withdrawn: 'statusWithdrawn',
} as const;

const STATUS_TONE = {
  pending_payment: 'soft',
  confirmed: 'info',
  checked_in: 'gold',
  disqualified: 'neutral',
  withdrawn: 'neutral',
} as const;

const formatAmount = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });

export type EntryRow = {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'checked_in' | 'disqualified' | 'withdrawn';
  seedNumber: number | null;
  checkedInAt: string | null;
  createdAt: string;
  createdLabel: string;
  disqualificationReason: string | null;
  finalPlacement: number | null;
  team: { id: string; slug: string; name: string; tag: string };
  crestColor?: string;
  registeredBy: string;
  paidKwd: number;
};

type Action = 'disqualify' | 'reinstate' | 'check_in' | 'undo_check_in';

type Props = {
  entries: EntryRow[];
  entryFeeKwd: number;
  /** False once the bracket exists: entries are read-only. */
  editable: boolean;
  locale: string;
};

const ACTIONS_BY_STATUS: Record<EntryRow['status'], Action[]> = {
  pending_payment: ['disqualify'],
  confirmed: ['check_in', 'disqualify'],
  checked_in: ['undo_check_in', 'disqualify'],
  disqualified: ['reinstate'],
  withdrawn: [],
};

const ICONS: Record<Action, React.ReactNode> = {
  check_in: <UserCheck className="bx-icon" aria-hidden />,
  undo_check_in: <UserMinus className="bx-icon" aria-hidden />,
  disqualify: <Ban className="bx-icon" aria-hidden />,
  reinstate: <RotateCcw className="bx-icon" aria-hidden />,
};

/** M-04 / M-05: every entry with status and payment; check in, disqualify, reinstate. */
export function EntriesTable({ entries, entryFeeKwd, editable, locale }: Props) {
  const t = useTranslations('tournamentAdmin');
  const tReg = useTranslations('registration');
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [disqualifying, setDisqualifying] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const send = async (entry: EntryRow, action: Action, why?: string) => {
    setBusy(entry.id);
    setError(null);
    try {
      const res = await fetch(`/api/manage/registrations/${encodeURIComponent(entry.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, reason: why ?? null }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      setDisqualifying(null);
      setReason('');
      router.refresh();
    } catch (err) {
      setError({ id: entry.id, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  const payment = (e: EntryRow) => {
    if (entryFeeKwd <= 0) return t('feeNone');
    if (e.paidKwd >= entryFeeKwd) return t('paid', { amount: formatAmount(e.paidKwd) });
    if (e.status === 'confirmed' || e.status === 'checked_in') return t('paidOther');
    return t('unpaid');
  };

  return (
    <ul className="m-0 grid list-none gap-2 p-0" data-testid="entries-table">
      {entries.map((e) => {
        const actions = editable ? ACTIONS_BY_STATUS[e.status] : [];
        const muted = e.status === 'withdrawn' || e.status === 'disqualified';
        return (
          <li
            key={e.id}
            className={[
              'bx-card bx-card--flat grid gap-3 px-4 py-3',
              muted ? 'opacity-70' : '',
            ].join(' ')}
            data-testid={`entry-${e.team.slug}`}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 min-[800px]:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
              <TeamCrest tag={e.team.tag} color={e.crestColor} size={36} />
              <div className="grid min-w-0 gap-0.5">
                <Link
                  href={`/${locale}/teams/${e.team.slug}`}
                  className="truncate font-display text-[16px] font-bold text-ink no-underline hover:text-gold-text"
                >
                  {e.team.name}
                </Link>
                <span className="text-[12px] text-ink-muted">
                  {t('entryMeta', { name: e.registeredBy, date: e.createdLabel })}
                </span>
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-2 min-[800px]:col-span-1">
                <Tag tone={STATUS_TONE[e.status]}>
                  <span data-testid={`entry-status-${e.team.slug}`}>
                    {tReg(STATUS_KEY[e.status])}
                  </span>
                </Tag>
                <span className="text-[13px] text-ink-muted">{payment(e)}</span>
                {e.seedNumber ? (
                  <span className="bx-num text-[13px] text-ink-muted">
                    {t('seedShort', { seed: e.seedNumber })}
                  </span>
                ) : null}
              </div>
              {actions.length > 0 && disqualifying !== e.id ? (
                <div className="col-span-2 flex flex-wrap gap-2 min-[800px]:col-span-1 min-[800px]:justify-end">
                  {actions.map((a) => (
                    <Button
                      key={a}
                      size="sm"
                      variant={a === 'disqualify' ? 'danger' : a === 'check_in' ? 'gold' : 'ink'}
                      disabled={busy === e.id}
                      onClick={() =>
                        a === 'disqualify' ? (setDisqualifying(e.id), setReason('')) : send(e, a)
                      }
                      data-testid={`entry-action-${a}-${e.team.slug}`}
                    >
                      {ICONS[a]}
                      {t(`entryAction.${a}`)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            {e.status === 'disqualified' && e.disqualificationReason ? (
              <p className="m-0 text-[13px] text-negative">
                {t('disqualifiedReason', { reason: e.disqualificationReason })}
              </p>
            ) : null}

            {disqualifying === e.id ? (
              <form
                className="bx-inset grid gap-3 p-4"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (reason.trim()) void send(e, 'disqualify', reason.trim());
                }}
              >
                <label className="bx-eyebrow block" htmlFor={`dq-reason-${e.id}`}>
                  {t('disqualifyReasonLabel', { team: e.team.name })}
                </label>
                <textarea
                  id={`dq-reason-${e.id}`}
                  className="bx-field min-h-[72px] py-3"
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  maxLength={500}
                  required
                  data-testid="disqualify-reason"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    disabled={busy === e.id || !reason.trim()}
                    data-testid="disqualify-confirm"
                  >
                    <Ban className="bx-icon" aria-hidden />
                    {busy === e.id ? t('working') : t('disqualifyConfirm')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisqualifying(null)}
                    disabled={busy === e.id}
                  >
                    {t('confirmNo')}
                  </Button>
                </div>
              </form>
            ) : null}

            {error?.id === e.id ? (
              <p className="m-0 text-[12px] text-negative" role="alert">
                {t('errorGeneric', { message: error.message })}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
