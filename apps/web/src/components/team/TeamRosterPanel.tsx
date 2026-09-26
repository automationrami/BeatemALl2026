'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Crown, UserMinus } from 'lucide-react';
import { Avatar, Button, Tag } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

export type RosterRole = 'captain' | 'co_captain' | 'starter' | 'substitute' | 'coach' | 'manager';
type MemberAction = 'promote' | 'demote' | 'remove' | 'transfer_captaincy';

type Member = {
  playerSlug: string;
  displayName: string;
  role: RosterRole;
  inGameRole: string | null;
};

type Props = {
  locale: string;
  teamSlug: string;
  members: Member[];
  /** The viewer's role on this team, or null when they aren't on it (or it's disbanded). */
  viewerRole: RosterRole | null;
  viewerSlug: string | null;
};

const LEADER: readonly RosterRole[] = ['captain', 'co_captain'];

/** Which roster actions the viewer may take on a member (mirrors `updateTeamMember`). */
function allowedActions(
  viewerRole: RosterRole | null,
  viewerSlug: string | null,
  m: Member,
): MemberAction[] {
  if (!viewerRole || !LEADER.includes(viewerRole) || m.playerSlug === viewerSlug) return [];
  if (viewerRole === 'co_captain') return LEADER.includes(m.role) ? [] : ['remove'];
  if (m.role === 'captain') return [];
  if (m.role === 'co_captain') return ['demote', 'transfer_captaincy', 'remove'];
  return ['promote', 'transfer_captaincy', 'remove'];
}

const ICONS: Record<MemberAction, React.ReactNode> = {
  promote: <ArrowUp className="bx-icon" aria-hidden />,
  demote: <ArrowDown className="bx-icon" aria-hidden />,
  transfer_captaincy: <Crown className="bx-icon" aria-hidden />,
  remove: <UserMinus className="bx-icon" aria-hidden />,
};

/** The team's real roster; captains and co-captains get promote / demote / transfer / remove. */
export function TeamRosterPanel({ locale, teamSlug, members, viewerRole, viewerSlug }: Props) {
  const t = useTranslations('roster');
  const router = useRouter();
  const [pending, setPending] = useState<{ slug: string; action: MemberAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionLabel: Record<MemberAction, string> = {
    promote: t('actionPromote'),
    demote: t('actionDemote'),
    transfer_captaincy: t('actionTransfer'),
    remove: t('actionRemove'),
  };

  const confirmText = (m: Member, action: MemberAction) => {
    const name = m.displayName;
    if (action === 'promote') return t('confirmPromote', { name });
    if (action === 'demote') return t('confirmDemote', { name });
    if (action === 'transfer_captaincy') return t('confirmTransfer', { name });
    return t('confirmRemove', { name });
  };

  const run = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(teamSlug)}/members/${encodeURIComponent(pending.slug)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: pending.action }),
        },
      );
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      setPending(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (members.length === 0) {
    return (
      <div className="bx-card bx-card--flat p-6 text-[14px] text-ink-muted" data-testid="roster">
        {t('emptyRoster')}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <ul className="bx-roster" data-testid="roster">
        {members.map((m) => {
          const actions = allowedActions(viewerRole, viewerSlug, m);
          const confirming = pending?.slug === m.playerSlug ? pending.action : null;
          return (
            <li
              key={m.playerSlug}
              data-testid={`member-${m.playerSlug}`}
              data-role={m.role}
              className="grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <Avatar name={m.displayName} size={40} />
              <Link
                href={`/${locale}/players/${m.playerSlug}`}
                className="min-w-0 hover:brightness-125"
              >
                <b dir="auto">{m.displayName}</b>
                <small>
                  <bdi dir="ltr">@{m.playerSlug}</bdi>
                  {m.inGameRole ? ` · ${m.inGameRole}` : ''}
                </small>
              </Link>
              <Tag
                tone={m.role === 'captain' ? 'gold' : m.role === 'co_captain' ? 'ink' : 'neutral'}
              >
                {t(`roles.${m.role}`)}
              </Tag>

              {actions.length > 0 && !confirming ? (
                <div className="col-span-full flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <Button
                      key={a}
                      size="sm"
                      variant={a === 'remove' ? 'danger' : 'ghost'}
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setPending({ slug: m.playerSlug, action: a });
                      }}
                      data-testid={`member-action-${a}-${m.playerSlug}`}
                    >
                      {ICONS[a]}
                      {actionLabel[a]}
                    </Button>
                  ))}
                </div>
              ) : null}

              {confirming ? (
                <div className="bx-inset col-span-full grid gap-3 p-3">
                  <p className="m-0 text-[14px] text-ink" role="alert">
                    {confirmText(m, confirming)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={confirming === 'remove' ? 'danger' : 'gold'}
                      disabled={busy}
                      onClick={run}
                      data-testid="member-confirm"
                    >
                      {busy ? t('working') : actionLabel[confirming]}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setPending(null)}
                      data-testid="member-cancel"
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="member-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
