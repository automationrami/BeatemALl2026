'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Send } from 'lucide-react';
import { Button, Notice } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type GameOption = { slug: string; name: string };

export type VenueFormValues = {
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
  email: string;
  description: string;
  hourlyRateKwd: number;
  games: { slug: string; seatsCount: number }[];
  opensAtTime: string;
  closesAtTime: string;
  isOpen24h: boolean;
  cancellationWindowHours: number;
  acceptsWalkIns: boolean;
  isActive: boolean;
};

type Props =
  | { mode: 'register'; gameOptions: GameOption[] }
  | { mode: 'edit'; gameOptions: GameOption[]; venueSlug: string; initial: VenueFormValues };

const EMPTY: VenueFormValues = {
  name: '',
  city: '',
  address: '',
  phoneNumber: '',
  email: '',
  description: '',
  hourlyRateKwd: 1,
  games: [],
  opensAtTime: '12:00',
  closesAtTime: '02:00',
  isOpen24h: false,
  cancellationWindowHours: 24,
  acceptsWalkIns: true,
  isActive: true,
};

/**
 * Venue details form. `register` submits a new application (V-01) and opens the venue's
 * manage page; `edit` saves changes for the venue's managers (V-03).
 */
export function VenueForm(props: Props) {
  const t = useTranslations('venueOwner');
  const locale = useLocale();
  const router = useRouter();
  const initial = props.mode === 'edit' ? props.initial : EMPTY;

  const [businessName, setBusinessName] = useState('');
  const [v, setV] = useState<VenueFormValues>(initial);
  const [seats, setSeats] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.games.map((g) => [g.slug, String(g.seatsCount)])),
  );
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(initial.games.map((g) => g.slug)),
  );
  const [rate, setRate] = useState(String(initial.hourlyRateKwd));
  const [windowHours, setWindowHours] = useState(String(initial.cancellationWindowHours));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof VenueFormValues>(key: K, value: VenueFormValues[K]) => {
    setSaved(false);
    setV((prev) => ({ ...prev, [key]: value }));
  };

  const gamesPayload = useMemo(
    () =>
      props.gameOptions
        .filter((g) => picked.has(g.slug))
        .map((g) => ({
          gameSlug: g.slug,
          seatsCount: Math.max(1, Number.parseInt(seats[g.slug] ?? '', 10) || 0),
        })),
    [props.gameOptions, picked, seats],
  );
  const totalSeats = gamesPayload.reduce((sum, g) => sum + g.seatsCount, 0);

  const toggleGame = (slug: string) => {
    setSaved(false);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    setSeats((prev) => (prev[slug] ? prev : { ...prev, [slug]: '4' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (gamesPayload.length === 0) {
      setError(t('form.errorNoGames'));
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);
    const shared = {
      city: v.city,
      address: v.address,
      phoneNumber: v.phoneNumber,
      email: v.email.trim() || null,
      description: v.description.trim() || null,
      games: gamesPayload,
      hourlyRateKwd: Number(rate),
      opensAtTime: v.isOpen24h ? null : v.opensAtTime,
      closesAtTime: v.isOpen24h ? null : v.closesAtTime,
      isOpen24h: v.isOpen24h,
      cancellationWindowHours: Number.parseInt(windowHours, 10) || 0,
      acceptsWalkIns: v.acceptsWalkIns,
    };
    try {
      const res =
        props.mode === 'register'
          ? await fetch('/api/venues/applications', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                ...shared,
                businessName,
                venueName: v.name,
                countryCode: 'KW',
              }),
            })
          : await fetch(`/api/manage/venues/${encodeURIComponent(props.venueSlug)}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ ...shared, name: v.name, isActive: v.isActive }),
            });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      }
      if (props.mode === 'register') {
        const json = (await res.json()) as { venueSlug: string };
        router.push(`/${locale}/manage/venues/${json.venueSlug}`);
        router.refresh();
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'bx-eyebrow mb-2 block';

  return (
    <form
      className="bx-card grid gap-8 p-5 min-[900px]:p-8"
      onSubmit={submit}
      data-testid={props.mode === 'register' ? 'venue-register-form' : 'venue-edit-form'}
    >
      <fieldset className="grid gap-5">
        <legend className="bx-label mb-4 text-ink">{t('form.sectionVenue')}</legend>
        <div className="grid gap-5 min-[700px]:grid-cols-2">
          {props.mode === 'register' ? (
            <div>
              <label className={field} htmlFor="venue-business">
                {t('form.businessName')}
              </label>
              <input
                id="venue-business"
                className="bx-field"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
              <p className="mt-1.5 text-[12px] text-ink-muted">{t('form.businessNameHint')}</p>
            </div>
          ) : null}
          <div>
            <label className={field} htmlFor="venue-name">
              {t('form.venueName')}
            </label>
            <input
              id="venue-name"
              className="bx-field"
              value={v.name}
              onChange={(e) => set('name', e.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </div>
          <div>
            <label className={field} htmlFor="venue-city">
              {t('form.city')}
            </label>
            <input
              id="venue-city"
              className="bx-field"
              value={v.city}
              onChange={(e) => set('city', e.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </div>
          <div>
            <label className={field} htmlFor="venue-address">
              {t('form.address')}
            </label>
            <input
              id="venue-address"
              className="bx-field"
              value={v.address}
              onChange={(e) => set('address', e.target.value)}
              minLength={3}
              maxLength={200}
              required
            />
          </div>
          <div>
            <label className={field} htmlFor="venue-phone">
              {t('form.phone')}
            </label>
            <input
              id="venue-phone"
              type="tel"
              dir="ltr"
              className="bx-field"
              value={v.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              placeholder="+965 5000 0000"
              minLength={6}
              maxLength={20}
              required
            />
          </div>
          <div>
            <label className={field} htmlFor="venue-email">
              {t('form.email')}
            </label>
            <input
              id="venue-email"
              type="email"
              dir="ltr"
              className="bx-field"
              value={v.email}
              onChange={(e) => set('email', e.target.value)}
              maxLength={120}
            />
          </div>
        </div>
        <div>
          <label className={field} htmlFor="venue-description">
            {t('form.description')}
          </label>
          <textarea
            id="venue-description"
            className="bx-field resize-y py-2.5"
            rows={3}
            value={v.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={1000}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 border-t border-line pt-6" data-testid="venue-games">
        <legend className="bx-label mb-2 text-ink">{t('form.sectionGames')}</legend>
        <p className="m-0 text-[13px] text-ink-muted">{t('form.gamesHint')}</p>
        <ul className="m-0 grid list-none gap-2 p-0 min-[700px]:grid-cols-2">
          {props.gameOptions.map((g) => {
            const on = picked.has(g.slug);
            return (
              <li
                key={g.slug}
                className="bx-inset flex items-center justify-between gap-3 px-4 py-3"
              >
                <label className="flex min-w-0 items-center gap-3 font-display text-[15px] font-bold text-ink">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-gold-500"
                    checked={on}
                    onChange={() => toggleGame(g.slug)}
                    data-testid={`venue-game-${g.slug}`}
                  />
                  <span className="truncate">{g.name}</span>
                </label>
                {on ? (
                  <input
                    type="number"
                    min={1}
                    max={100}
                    inputMode="numeric"
                    aria-label={t('form.seatsFor', { game: g.name })}
                    className="bx-field bx-num w-24"
                    value={seats[g.slug] ?? ''}
                    onChange={(e) => {
                      setSaved(false);
                      setSeats((prev) => ({ ...prev, [g.slug]: e.target.value }));
                    }}
                    data-testid={`venue-seats-${g.slug}`}
                    required
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="m-0 font-display text-[13px] font-medium text-ink-muted">
          {t('form.totalSeats', { count: totalSeats })}
        </p>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-line pt-6">
        <legend className="bx-label mb-2 text-ink">{t('form.sectionPricing')}</legend>
        <div className="grid gap-5 min-[700px]:grid-cols-2">
          <div>
            <label className={field} htmlFor="venue-rate">
              {t('form.rate')}
            </label>
            <input
              id="venue-rate"
              type="number"
              min={0.25}
              max={100}
              step={0.25}
              inputMode="decimal"
              className="bx-field bx-num"
              value={rate}
              onChange={(e) => {
                setSaved(false);
                setRate(e.target.value);
              }}
              required
            />
          </div>
          <div>
            <p className="bx-eyebrow mb-2" id="venue-hours-label">
              {t('form.hours')}
            </p>
            <div className="bx-seg" role="group" aria-labelledby="venue-hours-label">
              <button
                type="button"
                aria-pressed={!v.isOpen24h}
                onClick={() => set('isOpen24h', false)}
              >
                {t('form.hoursSet')}
              </button>
              <button
                type="button"
                aria-pressed={v.isOpen24h}
                onClick={() => set('isOpen24h', true)}
                data-testid="venue-open-24h"
              >
                {t('form.hours24')}
              </button>
            </div>
          </div>
        </div>
        {!v.isOpen24h ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={field} htmlFor="venue-opens">
                  {t('form.opensAt')}
                </label>
                <input
                  id="venue-opens"
                  type="time"
                  dir="ltr"
                  className="bx-field bx-num [color-scheme:dark]"
                  value={v.opensAtTime}
                  onChange={(e) => set('opensAtTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={field} htmlFor="venue-closes">
                  {t('form.closesAt')}
                </label>
                <input
                  id="venue-closes"
                  type="time"
                  dir="ltr"
                  className="bx-field bx-num [color-scheme:dark]"
                  value={v.closesAtTime}
                  onChange={(e) => set('closesAtTime', e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="m-0 text-[12px] text-ink-muted">{t('form.hoursOvernightHint')}</p>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-5 border-t border-line pt-6">
        <legend className="bx-label mb-2 text-ink">{t('form.sectionPolicy')}</legend>
        <div className="grid gap-5 min-[700px]:grid-cols-2">
          <div>
            <label className={field} htmlFor="venue-window">
              {t('form.cancelWindow')}
            </label>
            <input
              id="venue-window"
              type="number"
              min={0}
              max={72}
              inputMode="numeric"
              className="bx-field bx-num"
              value={windowHours}
              onChange={(e) => {
                setSaved(false);
                setWindowHours(e.target.value);
              }}
              required
            />
            <p className="mt-1.5 text-[12px] text-ink-muted">{t('form.cancelWindowHint')}</p>
          </div>
          <div>
            <p className="bx-eyebrow mb-2" id="venue-walkins-label">
              {t('form.walkIns')}
            </p>
            <div className="bx-seg" role="group" aria-labelledby="venue-walkins-label">
              <button
                type="button"
                aria-pressed={v.acceptsWalkIns}
                onClick={() => set('acceptsWalkIns', true)}
              >
                {t('form.walkInsYes')}
              </button>
              <button
                type="button"
                aria-pressed={!v.acceptsWalkIns}
                onClick={() => set('acceptsWalkIns', false)}
              >
                {t('form.walkInsNo')}
              </button>
            </div>
          </div>
          {props.mode === 'edit' ? (
            <div>
              <p className="bx-eyebrow mb-2" id="venue-accepting-label">
                {t('form.accepting')}
              </p>
              <div className="bx-seg" role="group" aria-labelledby="venue-accepting-label">
                <button
                  type="button"
                  aria-pressed={v.isActive}
                  onClick={() => set('isActive', true)}
                  data-testid="venue-accepting-on"
                >
                  {t('form.acceptingOn')}
                </button>
                <button
                  type="button"
                  aria-pressed={!v.isActive}
                  onClick={() => set('isActive', false)}
                  data-testid="venue-accepting-off"
                >
                  {t('form.acceptingOff')}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-muted">{t('form.acceptingHint')}</p>
            </div>
          ) : null}
        </div>
      </fieldset>

      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 font-display text-[13px] font-medium leading-relaxed text-negative"
          data-testid="venue-form-error"
        >
          {t('form.errorGeneric', { message: error })}
        </p>
      ) : null}
      {saved ? (
        <div data-testid="venue-saved">
          <Notice tone="neutral" icon={<Check className="bx-icon text-positive" aria-hidden />}>
            {t('form.saved')}
          </Notice>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          variant="gold"
          type="submit"
          disabled={submitting}
          data-testid={props.mode === 'register' ? 'venue-register-submit' : 'venue-save'}
        >
          {props.mode === 'register' ? (
            <>
              <Send className="bx-icon size-4" aria-hidden />
              {submitting ? t('form.submitting') : t('form.submit')}
            </>
          ) : (
            <>
              <Check className="bx-icon size-4" aria-hidden />
              {submitting ? t('form.saving') : t('form.save')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
