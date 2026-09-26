'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button, SegmentedTabs } from '@beat-em-all/ui';
import { PERSONAS, useActAsPersona } from '@beat-em-all/api-client';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

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
      setError(t('errorInvalidDates'));
      return;
    }
    if (endDate <= startDate) {
      setError(t('errorEndBeforeStart'));
      return;
    }
    if (startDate < new Date(Date.now() - 60_000)) {
      setError(t('errorStartInPast'));
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
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
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

  const persona = PERSONAS[personaId];
  const personaName =
    (locale === 'ar' ? persona?.arabicName : persona?.displayName) ?? persona?.slug ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-surface-000/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-modal-title"
    >
      <div
        className="my-auto grid w-full max-w-lg gap-6 rounded-xl bg-surface-100 p-6 text-ink shadow-bx-lift md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-4">
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="bx-eyebrow">{t('detailEyebrow')}</p>
            <h2
              id="challenge-modal-title"
              className="font-display text-[28px] font-bold leading-[1.1] text-ink"
            >
              {t('modalTitle', { teamName: targetTeamName })}
            </h2>
            <p className="text-[14px] leading-relaxed text-ink-muted">
              {loadingSelf
                ? t('loadingTeam')
                : selfTeam
                  ? t('modalSubtitle', { selfTeamName: selfTeam.teamName })
                  : t('errorNoTeam')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="bx-btn--icon -me-2 -mt-1"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X className="bx-icon" aria-hidden />
          </Button>
        </header>

        {!loadingSelf && !selfTeam ? (
          <div className="grid gap-4">
            {selfTeamError ? (
              <p className="rounded-md bg-negative-soft px-4 py-3 text-[14px] leading-relaxed text-negative">
                {t('errorGeneric', { message: selfTeamError })}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t('cancelCta')}
              </Button>
              <Button
                variant="gold"
                onClick={() => {
                  onClose();
                  router.push(`/${locale}/teams/new`);
                }}
                data-testid="challenge-create-team-cta"
              >
                {t('createTeamCta')}
              </Button>
            </div>
          </div>
        ) : null}

        {!loadingSelf && selfTeam && sharedGames.length === 0 ? (
          <div className="grid gap-4">
            <p className="rounded-md bg-negative-soft px-4 py-3 text-[14px] leading-relaxed text-ink">
              {t('errorNoSharedGames', {
                selfTeam: selfTeam.teamName,
                selfGames: selfTeam.games.map((g) => gameLabels[g] ?? g).join(', ') || '—',
                otherTeam: targetTeamName,
                otherGames: targetTeamGames.map((g) => gameLabels[g] ?? g).join(', ') || '—',
              })}
            </p>
            <div className="flex justify-end">
              <Button variant="ink" onClick={onClose}>
                {t('cancelCta')}
              </Button>
            </div>
          </div>
        ) : null}

        {!loadingSelf && selfTeam && sharedGames.length > 0 ? (
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <p className="bx-eyebrow mb-2" id="challenge-game-label">
                {t('fieldGame')}
              </p>
              <div
                className="bx-gametiles"
                role="group"
                aria-labelledby="challenge-game-label"
                id="challenge-game"
              >
                {sharedGames.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="bx-gametile"
                    aria-pressed={game === g}
                    onClick={() => setGame(g)}
                  >
                    {gameLabels[g] ?? g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="bx-eyebrow mb-2" id="challenge-format">
                {t('fieldFormat')}
              </p>
              <SegmentedTabs
                label={t('fieldFormat')}
                items={FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
                value={format}
                onChange={(v) => setFormat(v as (typeof FORMATS)[number])}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="bx-eyebrow mb-2 block" htmlFor="challenge-start">
                  {t('fieldDateRangeStart')}
                </label>
                <input
                  id="challenge-start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="bx-field"
                  required
                />
              </div>
              <div>
                <label className="bx-eyebrow mb-2 block" htmlFor="challenge-end">
                  {t('fieldDateRangeEnd')}
                </label>
                <input
                  id="challenge-end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="bx-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="bx-eyebrow mb-2 block" htmlFor="challenge-venue">
                {t('fieldVenue')}
              </label>
              <input
                id="challenge-venue"
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={t('fieldVenuePlaceholder')}
                className="bx-field"
              />
            </div>

            <div>
              <label className="bx-eyebrow mb-2 block" htmlFor="challenge-message">
                {t('fieldMessage')}
              </label>
              <textarea
                id="challenge-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('fieldMessagePlaceholder')}
                rows={2}
                className="bx-field py-2.5"
              />
            </div>

            {error ? (
              <p
                className="rounded-md bg-negative-soft px-4 py-3 text-[14px] leading-relaxed text-negative"
                role="alert"
              >
                {t('errorGeneric', { message: error })}
              </p>
            ) : null}

            <div className="grid gap-4 border-t border-line pt-5">
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
                  {t('cancelCta')}
                </Button>
                <Button variant="gold" type="submit" disabled={submitting || !game}>
                  {submitting ? '…' : t('submitCta')}
                </Button>
              </div>
              <p className="bx-eyebrow text-end" data-testid="acting-as">
                {t('actingAs', { persona: personaName })}
              </p>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
