'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';
import { PERSONAS, useActAsPersona } from '@beat-em-all/api-client';

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
            {t('modalTitle', { venueName })}
          </h2>
          <p className="text-[var(--t-3)] text-[13px] leading-relaxed">
            {selfTeamStatus.kind === 'loading'
              ? '…'
              : selfTeamStatus.kind === 'error'
                ? t('errorGeneric', { message: selfTeamStatus.message })
                : selfTeamStatus.team
                  ? t('modalSubtitle', { selfTeamName: selfTeamStatus.team.teamName })
                  : t('errorNoTeam')}
          </p>
        </header>

        {selfTeamStatus.kind === 'error' ? (
          <div className="mt-4 space-y-3" data-testid="booking-load-error">
            <p className="text-[var(--coral-2)] text-[12px] leading-relaxed">
              {t('errorGeneric', { message: selfTeamStatus.message })}
            </p>
            <Button tone="ghost" size="sm" onClick={onClose}>
              {t('cancelCta')}
            </Button>
          </div>
        ) : null}

        {selfTeamStatus.kind === 'loaded' && !selfTeam ? (
          <div className="mt-4 space-y-3">
            <Button
              tone="primary"
              size="sm"
              onClick={() => {
                onClose();
                router.push(`/${locale}/teams/new`);
              }}
              data-testid="booking-create-team-cta"
            >
              {t('createTeamCta')} →
            </Button>
            <Button tone="ghost" size="sm" onClick={onClose}>
              {t('cancelCta')}
            </Button>
          </div>
        ) : null}

        {selfTeamStatus.kind === 'loaded' && selfTeam && eligibleGames.length === 0 ? (
          <div className="rounded-xl border border-[var(--coral)] bg-[rgba(251,113,133,0.08)] p-4 mb-4">
            <p className="text-[var(--coral-2)] text-[13px] leading-relaxed">
              {t('errorNoEligibleGames', {
                selfTeam: selfTeam.teamName,
                venueName,
                venueGames: supportedGames.map((g) => g.name).join(', ') || '—',
              })}
            </p>
            <div className="mt-3">
              <Button tone="ghost" size="sm" onClick={onClose}>
                {t('cancelCta')}
              </Button>
            </div>
          </div>
        ) : null}

        {selfTeamStatus.kind === 'loaded' && selfTeam && eligibleGames.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="booking-game">
                {t('fieldGame')}
              </label>
              <select
                id="booking-game"
                value={gameSlug}
                onChange={(e) => setGameSlug(e.target.value)}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
              >
                {eligibleGames.map((g) => (
                  <option key={g.slug} value={g.slug} className="bg-[var(--bg-2)]">
                    {g.name} · {t('seatsAvailable', { count: g.seatsCount })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="booking-start">
                {t('fieldStart')}
              </label>
              <input
                id="booking-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
                required
              />
            </div>

            <div>
              <p className="bx-eyebrow mb-2">{t('fieldDuration')}</p>
              <div className="flex gap-2">
                {DURATIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDurationHours(h)}
                    className={[
                      'px-4 py-2 rounded-xl border text-sm font-display font-medium transition-colors',
                      durationHours === h
                        ? 'border-[var(--violet-2)] bg-[rgba(139,92,246,0.12)] text-white'
                        : 'border-[var(--line-2)] bg-[var(--bg-1)] text-[var(--t-3)] hover:text-white',
                    ].join(' ')}
                  >
                    {t('hoursLabel', { hours: h })}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="booking-seats">
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
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
                required
              />
            </div>

            <div>
              <label className="bx-eyebrow block mb-2" htmlFor="booking-notes">
                {t('fieldNotes')}
              </label>
              <textarea
                id="booking-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('fieldNotesPlaceholder')}
                rows={2}
                className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display placeholder:text-[var(--t-4)]"
              />
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-4">
              <p className="bx-eyebrow mb-1">{t('priceEyebrow')}</p>
              <p className="font-display font-medium text-[20px]">
                {t('priceLine', {
                  rate: venueHourlyRateKwd,
                  seats: seatsCount,
                  hours: durationHours,
                  total: totalKwd.toFixed(2),
                })}
              </p>
              <p className="text-[var(--t-4)] text-[11px] mt-1">{t('priceFootnote')}</p>
            </div>

            {error ? (
              <p
                className="text-[var(--coral-2)] text-[12px] leading-relaxed"
                data-testid="booking-error"
              >
                {t('errorGeneric', { message: error })}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button tone="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>
                {t('cancelCta')}
              </Button>
              <Button
                tone="primary"
                size="sm"
                type="submit"
                disabled={submitting || !gameSlug}
                data-testid="booking-submit"
              >
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
