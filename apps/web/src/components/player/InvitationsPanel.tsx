'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Button, TeamCrest } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Invitation = {
  teamSlug: string;
  teamName: string;
  teamTag: string;
  accentColor: string;
  /** Pre-formatted on the server (Kuwait time). */
  expiresLabel: string;
  invitedByName: string | null;
};

type Props = { locale: string; invitations: Invitation[] };

/** P-06: the player's open team invitations with accept / decline. */
export function InvitationsPanel({ locale, invitations }: Props) {
  const t = useTranslations('invitations');
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (teamSlug: string, action: 'accept' | 'decline') => {
    setBusy(`${action}:${teamSlug}`);
    setError(null);
    try {
      const res = await fetch(`/api/me/invitations/${encodeURIComponent(teamSlug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  if (invitations.length === 0) {
    return <p className="m-0 text-[14px] text-ink-muted">{t('empty')}</p>;
  }

  return (
    <div className="grid gap-3">
      <ul className="m-0 grid list-none gap-3 p-0">
        {invitations.map((inv) => (
          <li
            key={inv.teamSlug}
            className="bx-card bx-card--flat flex flex-wrap items-center gap-4 p-4"
            data-testid={`invitation-${inv.teamSlug}`}
          >
            <TeamCrest tag={inv.teamTag} color={inv.accentColor} size={48} />
            <div className="grid min-w-0 flex-1 basis-[200px] gap-1">
              <Link
                href={`/${locale}/teams/${inv.teamSlug}`}
                className="truncate font-display text-[17px] font-bold text-ink hover:brightness-125"
                dir="auto"
              >
                {inv.teamName}
              </Link>
              <span className="text-[13px] text-ink-muted">
                {inv.invitedByName
                  ? t('invitedBy', { name: inv.invitedByName, when: inv.expiresLabel })
                  : t('expires', { when: inv.expiresLabel })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="gold"
                size="sm"
                disabled={busy !== null}
                onClick={() => respond(inv.teamSlug, 'accept')}
                data-testid={`invitation-accept-${inv.teamSlug}`}
              >
                <Check className="bx-icon" aria-hidden />
                {busy === `accept:${inv.teamSlug}` ? t('working') : t('accept')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => respond(inv.teamSlug, 'decline')}
                data-testid={`invitation-decline-${inv.teamSlug}`}
              >
                <X className="bx-icon" aria-hidden />
                {busy === `decline:${inv.teamSlug}` ? t('working') : t('decline')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="invitation-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
