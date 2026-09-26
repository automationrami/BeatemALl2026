'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button, GameCard } from '@beat-em-all/ui';
import { PERSONAS, useActAsPersona } from '@beat-em-all/api-client';
import { GAMES } from '@beat-em-all/mock-data';
import type { GameId } from '@beat-em-all/types';
import { formatAmount } from './format';

type SelfTeam = {
  teamId: string;
  teamSlug: string;
  teamName: string;
  games: string[];
};

type Props = {
  venueSlug: string;
  venueName: string;
  venueHourlyRateKwd: number;
  supportedGames: { slug: string; name: string; seatsCount: number }[];
  onClose: () => void;
};

const DURATIONS = [1, 2, 3] as const;

function formatLocalDateInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/**
 * Modal that posts a venue booking.
 *
 * Constrains the game selector to the **intersection** of (a) games the venue supports
 * and (b) games the active persona's primary team plays — same pattern as ChallengeModal.
 */
export function BookingModal({
  venueSlug,
  venueName,
  venueHourlyRateKwd,
  supportedGames,
  onClose,
}: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const router = useRouter();
  const personaId = useActAsPersona((s) => s.activePersonaId);

  // Three-state self-team status: loading | error | loaded(team|null). Collapsing the
  // error and the no-team cases hides real failures (the silent-failure-hunter caught
  // this) — keeping them distinct lets us show a retry button on the error path.
  type SelfTeamStatus =
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'loaded'; team: SelfTeam | null };
  const [selfTeamStatus, setSelfTeamStatus] = useState<SelfTeamStatus>({ kind: 'loading' });
  const selfTeam = selfTeamStatus.kind === 'loaded' ? selfTeamStatus.team : null;

  const eligibleGames = useMemo(() => {
    if (!selfTeam) return [];
    const teamSet = new Set(selfTeam.games);
    return supportedGames.filter((g) => teamSet.has(g.slug));
  }, [selfTeam, supportedGames]);

  const [gameSlug, setGameSlug] = useState<string>('');
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return formatLocalDateInput(d);
  });
  const [durationHours, setDurationHours] = useState<(typeof DURATIONS)[number]>(2);
  const [seatsCount, setSeatsCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset on persona-switch so we never show one persona's team while submitting under
    // another's cookie. The next then/catch will resolve with the new persona's team.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelfTeamStatus({ kind: 'loading' });
    fetch('/api/me/team', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { team: SelfTeam | null };
      })
      .then((json) => {
        if (cancelled) return;
        setSelfTeamStatus({ kind: 'loaded', team: json.team ?? null });
      })
      .catch((err) => {
        if (cancelled) return;
        setSelfTeamStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  // Default game once eligibleGames computes.
  useEffect(() => {
    if (eligibleGames.length > 0 && !gameSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGameSlug(eligibleGames[0]?.slug ?? '');
    }
  }, [eligibleGames, gameSlug]);

  const selectedGame = useMemo(
    () => eligibleGames.find((g) => g.slug === gameSlug) ?? null,
    [eligibleGames, gameSlug],
  );

  // Cap seats to selected game's capacity (server enforces too).
  useEffect(() => {
    if (selectedGame && seatsCount > selectedGame.seatsCount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeatsCount(selectedGame.seatsCount);
    }
  }, [selectedGame, seatsCount]);

  const totalKwd = useMemo(() => {
    return Math.round(durationHours * seatsCount * venueHourlyRateKwd * 100) / 100;
  }, [durationHours, seatsCount, venueHourlyRateKwd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against double-submit via fast double-click or Enter-key when the disabled
    // attribute hasn't propagated yet. Network-level idempotency comes when E4-S3 wires
    // up Tap idempotency keys — for now this prevents the double-INSERT race on a single
    // client.
    if (submitting) return;
    if (!selfTeam || !gameSlug) return;

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      setError(t('errorInvalidDate'));
      return;
    }
    if (startDate.getTime() < Date.now() - 60_000) {
      setError(t('errorPastDate'));
      return;
    }
    const endDate = new Date(startDate.getTime() + durationHours * 3_600_000);

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${venueSlug}/bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          gameSlug,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          seatsCount,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { booking: { booking: { id: string } } };
      onClose();
      router.push(`/${locale}/bookings/${json.booking.booking.id}`);
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
      className="fixed inset-0 z-50 overflow-y-auto bg-surface-000/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="flex min-h-full items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-lg overflow-hidden rounded-xl bg-surface-100 text-ink shadow-bx-float"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 pb-5 pt-6">
            <div className="grid min-w-0 gap-2">
              <p className="bx-eyebrow">{t('detailEyebrow')}</p>
              <h2
                id="booking-modal-title"
                className="font-display text-[28px] font-bold leading-[30px] text-ink"
              >
                {t('modalTitle', { venueName })}
              </h2>
              <p className="font-display text-[14px] font-medium leading-[20px] text-ink-muted">
                {selfTeamStatus.kind === 'loading'
                  ? t('loadingTeam')
                  : selfTeamStatus.kind === 'error'
                    ? t('errorGeneric', { message: selfTeamStatus.message })
                    : selfTeamStatus.team
                      ? t('modalSubtitle', { selfTeamName: selfTeamStatus.team.teamName })
                      : t('errorNoTeam')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="bx-btn--icon shrink-0"
              onClick={onClose}
              aria-label={t('closeDialog')}
            >
              <X className="bx-icon size-4" aria-hidden />
            </Button>
          </header>

          <div className="px-6 pb-6 pt-5">
            {selfTeamStatus.kind === 'loading' ? (
              <div className="grid gap-3" aria-hidden>
                <div className="h-20 animate-pulse rounded-tile bg-surface-200" />
                <div className="h-11 animate-pulse rounded-md bg-surface-200" />
                <div className="h-11 animate-pulse rounded-md bg-surface-200" />
              </div>
            ) : null}

            {selfTeamStatus.kind === 'error' ? (
              <div className="grid justify-items-start gap-4" data-testid="booking-load-error">
                <p className="w-full rounded-md bg-negative-soft px-4 py-3 font-display text-[13px] font-medium leading-relaxed text-negative">
                  {t('errorGeneric', { message: selfTeamStatus.message })}
                </p>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  {t('cancelCta')}
                </Button>
              </div>
            ) : null}

            {selfTeamStatus.kind === 'loaded' && !selfTeam ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="gold"
                  onClick={() => {
                    onClose();
                    router.push(`/${locale}/teams/new`);
                  }}
                  data-testid="booking-create-team-cta"
                >
                  {t('createTeamCta')}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  {t('cancelCta')}
                </Button>
              </div>
            ) : null}

            {selfTeamStatus.kind === 'loaded' && selfTeam && eligibleGames.length === 0 ? (
              <div className="grid justify-items-start gap-4">
                <p className="w-full rounded-md bg-negative-soft px-4 py-3 font-display text-[13px] font-medium leading-relaxed text-negative">
                  {t('errorNoEligibleGames', {
                    selfTeam: selfTeam.teamName,
                    venueName,
                    venueGames: supportedGames.map((g) => g.name).join(', ') || '—',
                  })}
                </p>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  {t('cancelCta')}
                </Button>
              </div>
            ) : null}

            {selfTeamStatus.kind === 'loaded' && selfTeam && eligibleGames.length > 0 ? (
              <form onSubmit={handleSubmit} className="grid gap-5">
                <div>
                  <p className="bx-eyebrow mb-2" id="booking-game-label">
                    {t('fieldGame')}
                  </p>
                  <div
                    id="booking-game"
                    role="group"
                    aria-labelledby="booking-game-label"
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  >
                    {eligibleGames.map((g) => {
                      const meta = GAMES[g.slug as GameId];
                      return (
                        <GameCard
                          key={g.slug}
                          shortName={meta?.shortName ?? g.name}
                          // Isolate the (Latin) game name so the line reads correctly in RTL.
                          title={`⁨${g.name}⁩ · ${t('seatsAvailable', { count: g.seatsCount })}`}
                          brandColor={meta?.brandColor ?? ''}
                          selected={gameSlug === g.slug}
                          onToggle={() => setGameSlug(g.slug)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="bx-eyebrow mb-2 block" htmlFor="booking-start">
                    {t('fieldStart')}
                  </label>
                  <input
                    id="booking-start"
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="bx-field [color-scheme:dark]"
                    required
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="bx-eyebrow mb-2" id="booking-duration-label">
                      {t('fieldDuration')}
                    </p>
                    <div className="bx-seg" role="group" aria-labelledby="booking-duration-label">
                      {DURATIONS.map((h) => (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={durationHours === h}
                          onClick={() => setDurationHours(h)}
                        >
                          {t('hoursLabel', { hours: h })}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="bx-eyebrow mb-2 block" htmlFor="booking-seats">
                      {t('fieldSeats', { max: selectedGame?.seatsCount ?? 1 })}
                    </label>
                    <input
                      id="booking-seats"
                      type="number"
                      min={1}
                      max={selectedGame?.seatsCount ?? 1}
                      value={seatsCount}
                      onChange={(e) => {
                        const max = selectedGame?.seatsCount ?? 1;
                        const parsed = Number.parseInt(e.target.value, 10);
                        if (Number.isNaN(parsed)) return;
                        setSeatsCount(Math.min(max, Math.max(1, parsed)));
                      }}
                      className="bx-field bx-num"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="bx-eyebrow mb-2 block" htmlFor="booking-notes">
                    {t('fieldNotes')}
                  </label>
                  <textarea
                    id="booking-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('fieldNotesPlaceholder')}
                    rows={2}
                    className="bx-field resize-y py-2.5"
                  />
                </div>

                <div className="bx-inset grid gap-3 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                    <div className="grid gap-1">
                      <p className="bx-eyebrow">{t('priceEyebrow')}</p>
                      <p className="font-display text-[13px] font-medium tabular-nums text-ink-muted">
                        {t('priceFormula', {
                          rate: formatAmount(venueHourlyRateKwd),
                          seats: seatsCount,
                          hours: durationHours,
                        })}
                      </p>
                    </div>
                    <p className="bx-num bx-gold-num text-[34px]" data-testid="booking-total">
                      {t('money', { amount: formatAmount(totalKwd) })}
                    </p>
                  </div>
                  <p className="font-display text-[12px] font-medium leading-[16px] text-ink-muted">
                    {t('priceFootnote')}
                  </p>
                </div>

                {error ? (
                  <p
                    className="rounded-md bg-negative-soft px-4 py-3 font-display text-[13px] font-medium leading-relaxed text-negative"
                    data-testid="booking-error"
                  >
                    {t('errorGeneric', { message: error })}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p
                    className="font-display text-[12px] font-medium text-ink-muted"
                    data-testid="acting-as"
                  >
                    {t('actingAs', { persona: personaSlug })}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
                      {t('cancelCta')}
                    </Button>
                    <Button
                      variant="gold"
                      type="submit"
                      disabled={submitting || !gameSlug}
                      data-testid="booking-submit"
                    >
                      {submitting ? t('submitting') : t('submitCta')}
                    </Button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
