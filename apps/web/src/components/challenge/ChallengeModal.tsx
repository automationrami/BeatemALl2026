'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';
import { PERSONAS, useActAsPersona } from '@beat-em-all/api-client';

type Props = {
  targetTeamSlug: string;
  targetTeamName: string;
  targetTeamGames: string[];
  gameLabels: Record<string, string>;
  onClose: () => void;
};

type SelfTeam = {
  teamId: string;
  teamSlug: string;
  teamName: string;
  games: string[];
};

const FORMATS = ['bo1', 'bo3', 'bo5'] as const;

function formatLocalDateInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/**
 * Modal that posts a challenge.
 *
 * Loads the current persona's primary team via `/api/me/team` (lightweight endpoint) so we
 * can compute the games-intersection client-side and disable submission cleanly when there's
 * no shared game. Posts to `/api/challenges` with a Zod-validated body.
 *
 * Trust model in Phase 1: the persona cookie is the auth. Server re-validates the
 * intersection + that the current persona is on a team.
 */
export function ChallengeModal({
  targetTeamSlug,
  targetTeamName,
  targetTeamGames,
  gameLabels,
  onClose,
}: Props) {
  const t = useTranslations('challenge');
  const locale = useLocale();
  const router = useRouter();
  const personaId = useActAsPersona((s) => s.activePersonaId);

  const [selfTeam, setSelfTeam] = useState<SelfTeam | null>(null);
  const [selfTeamError, setSelfTeamError] = useState<string | null>(null);
  const [loadingSelf, setLoadingSelf] = useState(true);
  const sharedGames = useMemo(() => {
    if (!selfTeam) return [];
    const otherSet = new Set(targetTeamGames);
    return selfTeam.games.filter((g) => otherSet.has(g));
  }, [selfTeam, targetTeamGames]);

  const [game, setGame] = useState<string>('');
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('bo3');
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return formatLocalDateInput(d);
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(22, 0, 0, 0);
    return formatLocalDateInput(d);
  });
  const [venue, setVenue] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load self-team on mount.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/team', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) return { team: null as SelfTeam | null };
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as { team: SelfTeam | null };
      })
      .then((json) => {
        if (cancelled) return;
        setSelfTeam(json.team ?? null);
        setSelfTeamError(null);
        setLoadingSelf(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Surface the error so the user sees "couldn't load your team" not "you have no team".
        setSelfTeamError(err instanceof Error ? err.message : String(err));
        setLoadingSelf(false);
      });
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  // Default the game selection to the first shared game once we have it.
  // Intentional setState-in-effect: this is a true sync from external state (sharedGames
  // computed from a fetch result) to local form state, exactly the pattern the rule allows.
  useEffect(() => {
    if (sharedGames.length > 0 && !game) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGame(sharedGames[0] ?? '');
    }
  }, [sharedGames, game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfTeam || !game) return;

    // Client-side guards so the user gets immediate feedback rather than a server 400.
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError('Pick valid dates.');
      return;
    }
    if (endDate <= startDate) {
      setError('"Latest match date" must be after "Earliest match date".');
      return;
    }
    if (startDate < new Date(Date.now() - 60_000)) {
      setError("Earliest match date can't be in the past.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          challengedTeamSlug: targetTeamSlug,
          gameSlug: game,
          format,
          dateRangeStart: new Date(start).toISOString(),
          dateRangeEnd: new Date(end).toISOString(),
          proposedVenueSlug: venue.trim() || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { challenge: { id: string } };
      onClose();
      router.push(`/${locale}/challenges/${json.challenge.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const personaSlug = PERSONAS[personaId]?.slug ?? 'khaled-al-mutairi';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-[20px] border border-[var(--line-2)] bg-[var(--bg-2)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-5">
          <p className="bx-eyebrow mb-2">{t('detailEyebrow')}</p>
          <h2 className="font-display font-medium text-[24px] tracking-[-0.025em] mb-1">
            {t('modalTitle', { teamName: targetTeamName })}
          </h2>
          <p className="text-[var(--t-3)] text-[13px] leading-relaxed">
            {loadingSelf
              ? '…'
              : selfTeam
                ? t('modalSubtitle', { selfTeamName: selfTeam.teamName })
                : t('errorNoTeam')}
          </p>
        </header>

        {!loadingSelf && !selfTeam ? (
          <div className="mt-4 space-y-3">
            {selfTeamError ? (
              <p className="text-[var(--coral-2)] text-[12px] leading-relaxed">
                {t('errorGeneric', { message: selfTeamError })}
              </p>
            ) : null}
            <Button tone="ghost" size="sm" onClick={onClose}>
              {t('cancelCta')}
            </Button>
          </div>
        ) : null}

        {!loadingSelf && selfTeam && sharedGames.length === 0 ? (
          <div className="rounded-xl border border-[var(--coral)] bg-[rgba(251,113,133,0.08)] p-4 mb-4">
            <p className="text-[var(--coral-2)] text-[13px] leading-relaxed">
              {t('errorNoSharedGames', {
                selfTeam: selfTeam.teamName,
                selfGames: selfTeam.games.map((g) => gameLabels[g] ?? g).join(', ') || '—',
                otherTeam: targetTeamName,
                otherGames: targetTeamGames.map((g) => gameLabels[g] ?? g).join(', ') || '—',
              })}
            </p>
            <div className="mt-3">
              <Button tone="ghost" size="sm" onClick={onClose}>
                {t('cancelCta')}
              </Button>
            </div>
          </div>
        ) : null}

        {!loadingSelf && selfTeam && sharedGames.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="challenge-game">
                {t('fieldGame')}
              </label>
              <select
                id="challenge-game"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
              >
                {sharedGames.map((g) => (
                  <option key={g} value={g} className="bg-[var(--bg-2)]">
                    {gameLabels[g] ?? g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="challenge-format">
                {t('fieldFormat')}
              </label>
              <select
                id="challenge-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number])}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f} className="bg-[var(--bg-2)]">
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="bx-eyebrow block mb-2" htmlFor="challenge-start">
                  {t('fieldDateRangeStart')}
                </label>
                <input
                  id="challenge-start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
                  required
                />
              </div>
              <div>
                <label className="bx-eyebrow block mb-2" htmlFor="challenge-end">
                  {t('fieldDateRangeEnd')}
                </label>
                <input
                  id="challenge-end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
                  required
                />
              </div>
            </div>

            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="challenge-venue">
                {t('fieldVenue')}
              </label>
              <input
                id="challenge-venue"
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={t('fieldVenuePlaceholder')}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display placeholder:text-[var(--t-4)]"
              />
            </div>

            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="challenge-message">
                {t('fieldMessage')}
              </label>
              <textarea
                id="challenge-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('fieldMessagePlaceholder')}
                rows={2}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display placeholder:text-[var(--t-4)]"
              />
            </div>

            {error ? (
              <p className="text-[var(--coral-2)] text-[12px] leading-relaxed">
                {t('errorGeneric', { message: error })}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button tone="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>
                {t('cancelCta')}
              </Button>
              <Button tone="primary" size="sm" type="submit" disabled={submitting || !game}>
                {submitting ? '…' : t('submitCta')}
              </Button>
            </div>
            <p className="bx-eyebrow text-[var(--t-4)]" data-testid="acting-as">
              acting as: {personaSlug}
            </p>
          </form>
        ) : null}
      </div>
    </div>
  );
}
