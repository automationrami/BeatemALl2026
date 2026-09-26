'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Send, X } from 'lucide-react';
import { Avatar, Button, Notice } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Invite = {
  playerSlug: string;
  displayName: string;
  /** Pre-formatted on the server (Kuwait time). */
  expiresLabel: string;
};

type Props = { teamSlug: string; invites: Invite[] };

/** Captain view: invite a player by username and see / cancel pending invitations (T-02). */
export function InvitePanel({ teamSlug, invites }: Props) {
  const t = useTranslations('roster');
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const playerSlug = username.trim().replace(/^@/, '').toLowerCase();
    if (!playerSlug || submitting) return;
    setSubmitting(true);
    setError(null);
    setSent(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamSlug)}/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerSlug }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      const json = (await res.json()) as { invite: { displayName: string } };
      setSent(json.invite.displayName);
      setUsername('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (slug: string) => {
    setCancelling(slug);
    setError(null);
    setSent(null);
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(teamSlug)}/invites/${encodeURIComponent(slug)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="bx-card grid gap-5 p-5">
      <form className="grid gap-3" onSubmit={submit} data-testid="invite-form">
        <div className="grid gap-1">
          <label className="bx-label text-ink" htmlFor="invite-username">
            {t('inviteTitle')}
          </label>
          <p className="m-0 text-[13px] text-ink-muted">{t('inviteHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            id="invite-username"
            className="bx-field min-w-0 flex-1 basis-[220px]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('invitePlaceholder')}
            maxLength={80}
            dir="ltr"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            data-testid="invite-username"
          />
          <Button
            variant="gold"
            type="submit"
            disabled={submitting || !username.trim()}
            data-testid="invite-submit"
          >
            <Send className="bx-icon" aria-hidden />
            {submitting ? t('inviting') : t('inviteCta')}
          </Button>
        </div>
        {sent ? (
          <div data-testid="invite-sent">
            <Notice icon={<Check className="bx-icon" aria-hidden />}>
              {t('inviteSent', { name: sent })}
            </Notice>
          </div>
        ) : null}
        {error ? (
          <p
            className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
            role="alert"
            data-testid="invite-error"
          >
            {error}
          </p>
        ) : null}
      </form>

      <div className="grid gap-2">
        <h3 className="bx-eyebrow m-0">{t('pendingTitle', { count: invites.length })}</h3>
        {invites.length === 0 ? (
          <p className="m-0 text-[13px] text-ink-muted" data-testid="pending-invites">
            {t('pendingEmpty')}
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="pending-invites">
            {invites.map((i) => (
              <li
                key={i.playerSlug}
                className="bx-inset flex items-center gap-3 px-3 py-2"
                data-testid={`pending-invite-${i.playerSlug}`}
              >
                <Avatar name={i.displayName} size={32} />
                <div className="grid min-w-0 flex-1">
                  <b className="truncate font-display text-[14px] text-ink" dir="auto">
                    {i.displayName}
                  </b>
                  <small className="truncate text-[12px] text-ink-muted">
                    <bdi dir="ltr">@{i.playerSlug}</bdi> · {t('expires', { when: i.expiresLabel })}
                  </small>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={cancelling !== null}
                  onClick={() => cancel(i.playerSlug)}
                  data-testid={`invite-cancel-${i.playerSlug}`}
                >
                  <X className="bx-icon" aria-hidden />
                  {cancelling === i.playerSlug ? t('cancelling') : t('cancelInvite')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
