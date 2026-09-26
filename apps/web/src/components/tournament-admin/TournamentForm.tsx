'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Save, Trophy } from 'lucide-react';
import { Button, Notice } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';
import { fromKuwaitInput, toKuwaitInput } from './time';

type Format = 'bo1' | 'bo3' | 'bo5';
type Seeding = 'check_in' | 'random';

export type TournamentFormValues = {
  name: string;
  gameSlug: string;
  matchFormat: Format;
  teamSize: number;
  maxTeams: number;
  minTeams: number;
  entryFeeKwd: number;
  prizePoolKwd: number;
  startsAt: string | null;
  registrationClosesAt: string | null;
  description: string | null;
  rulesUrl: string | null;
  isOfficialSanctioned: boolean;
  awardsRankingPoints: boolean;
  seedingStrategy: Seeding;
};

type Props =
  | {
      mode: 'create';
      organizations: { slug: string; name: string; tier: string }[];
      games: { slug: string; name: string }[];
    }
  | {
      mode: 'edit';
      slug: string;
      isFederation: boolean;
      games: { slug: string; name: string }[];
      initial: TournamentFormValues;
      /** Teams have entered: team size and game can no longer change. */
      entriesExist: boolean;
    };

const FORMATS: readonly Format[] = ['bo1', 'bo3', 'bo5'];

/** Create (M-02) or edit (draft / registration open) a single-elimination tournament. */
export function TournamentForm(props: Props) {
  const t = useTranslations('tournamentAdmin');
  const locale = useLocale();
  const router = useRouter();
  const init = props.mode === 'edit' ? props.initial : null;

  const [org, setOrg] = useState(
    props.mode === 'create' ? (props.organizations[0]?.slug ?? '') : '',
  );
  const [name, setName] = useState(init?.name ?? '');
  const [game, setGame] = useState(init?.gameSlug ?? props.games[0]?.slug ?? '');
  const [format, setFormat] = useState<Format>(init?.matchFormat ?? 'bo3');
  const [teamSize, setTeamSize] = useState(String(init?.teamSize ?? 5));
  const [maxTeams, setMaxTeams] = useState(String(init?.maxTeams ?? 16));
  const [minTeams, setMinTeams] = useState(String(init?.minTeams ?? 2));
  const [fee, setFee] = useState(String(init?.entryFeeKwd ?? 0));
  const [prize, setPrize] = useState(String(init?.prizePoolKwd ?? 0));
  const [startsAt, setStartsAt] = useState(toKuwaitInput(init?.startsAt));
  const [closesAt, setClosesAt] = useState(toKuwaitInput(init?.registrationClosesAt));
  const [description, setDescription] = useState(init?.description ?? '');
  const [rulesUrl, setRulesUrl] = useState(init?.rulesUrl ?? '');
  const [seeding, setSeeding] = useState<Seeding>(init?.seedingStrategy ?? 'check_in');
  const [sanctioned, setSanctioned] = useState(init?.isOfficialSanctioned ?? false);
  const [rankingPoints, setRankingPoints] = useState(init?.awardsRankingPoints ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isFederation =
    props.mode === 'edit'
      ? props.isFederation
      : props.organizations.find((o) => o.slug === org)?.tier === 'federation';
  const locked = props.mode === 'edit' && props.entriesExist;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const startsIso = fromKuwaitInput(startsAt);
    if (!startsIso) {
      setError(t('errors.starts_required'));
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);
    const fields = {
      name: name.trim(),
      gameSlug: game,
      matchFormat: format,
      teamSize: Number.parseInt(teamSize, 10),
      maxTeams: Number.parseInt(maxTeams, 10),
      minTeams: Number.parseInt(minTeams, 10),
      entryFeeKwd: Number(fee || 0),
      prizePoolKwd: Number(prize || 0),
      startsAt: startsIso,
      registrationClosesAt: fromKuwaitInput(closesAt),
      description: description.trim() || null,
      rulesUrl: rulesUrl.trim() || null,
      seedingStrategy: seeding,
      isOfficialSanctioned: isFederation ? sanctioned : false,
      awardsRankingPoints: isFederation ? rankingPoints : false,
    };
    try {
      const res =
        props.mode === 'create'
          ? await fetch('/api/manage/tournaments', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ organizationSlug: org, ...fields }),
            })
          : await fetch(`/api/manage/tournaments/${encodeURIComponent(props.slug)}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                ...fields,
                // Unchanged start time is left out so a past date doesn't block other edits.
                startsAt: startsAt === toKuwaitInput(init?.startsAt) ? undefined : startsIso,
                ...(locked ? { teamSize: undefined, gameSlug: undefined } : {}),
              }),
            });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      if (props.mode === 'create') {
        const json = (await res.json()) as { tournament: { slug: string } };
        router.push(`/${locale}/manage/tournaments/${json.tournament.slug}`);
        router.refresh();
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setSubmitting(false);
  };

  const numberField = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { min: number; max: number; step?: string; disabled?: boolean; hint?: string },
  ) => (
    <div>
      <label className="bx-eyebrow mb-2 block" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className="bx-field bx-num"
        value={value}
        min={opts.min}
        max={opts.max}
        step={opts.step ?? '1'}
        onChange={(e) => set(e.target.value)}
        disabled={opts.disabled}
        required
        data-testid={id}
        aria-describedby={opts.hint ? `${id}-hint` : undefined}
      />
      {opts.hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-ink-muted">
          {opts.hint}
        </p>
      ) : null}
    </div>
  );

  return (
    <form
      className="bx-card grid gap-5 p-5 min-[900px]:p-8"
      onSubmit={submit}
      data-testid="tournament-form"
    >
      <div className="grid gap-1">
        <h2 className="bx-label text-ink">
          {props.mode === 'create' ? t('formCreateTitle') : t('formEditTitle')}
        </h2>
        <p className="m-0 max-w-[68ch] text-[14px] text-ink-muted">{t('formatNote')}</p>
      </div>

      <div className="grid gap-5 min-[700px]:grid-cols-2">
        {props.mode === 'create' ? (
          <div>
            <label className="bx-eyebrow mb-2 block" htmlFor="tournament-org">
              {t('fieldOrg')}
            </label>
            <select
              id="tournament-org"
              className="bx-field"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              required
              data-testid="tournament-org"
            >
              {props.organizations.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={props.mode === 'create' ? '' : 'min-[700px]:col-span-2'}>
          <label className="bx-eyebrow mb-2 block" htmlFor="tournament-name">
            {t('fieldName')}
          </label>
          <input
            id="tournament-name"
            className="bx-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={80}
            required
            data-testid="tournament-name"
          />
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="tournament-game">
            {t('fieldGame')}
          </label>
          <select
            id="tournament-game"
            className="bx-field"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            disabled={locked}
            required
            data-testid="tournament-game"
          >
            {props.games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="bx-eyebrow mb-2" id="tournament-format-label">
            {t('fieldMatchFormat')}
          </p>
          <div className="bx-seg" role="group" aria-labelledby="tournament-format-label">
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                data-testid={`tournament-format-${f}`}
              >
                {t(`format.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {numberField('tournament-team-size', t('fieldTeamSize'), teamSize, setTeamSize, {
          min: 1,
          max: 10,
          disabled: locked,
          hint: locked ? t('lockedHint') : undefined,
        })}
        {numberField('tournament-max-teams', t('fieldMaxTeams'), maxTeams, setMaxTeams, {
          min: 2,
          max: 128,
        })}
        {numberField('tournament-min-teams', t('fieldMinTeams'), minTeams, setMinTeams, {
          min: 2,
          max: 128,
        })}
        {numberField('tournament-fee', t('fieldEntryFee'), fee, setFee, {
          min: 0,
          max: 10000,
          step: '0.5',
        })}
        {numberField('tournament-prize', t('fieldPrizePool'), prize, setPrize, {
          min: 0,
          max: 1000000,
          step: '1',
        })}

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="tournament-starts">
            {t('fieldStartsAt')}
          </label>
          <input
            id="tournament-starts"
            type="datetime-local"
            className="bx-field [color-scheme:dark]"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            aria-describedby="tournament-time-hint"
            data-testid="tournament-starts"
          />
          <p id="tournament-time-hint" className="mt-1.5 text-[12px] text-ink-muted">
            {t('kuwaitTimeHint')}
          </p>
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="tournament-closes">
            {t('fieldClosesAt')}
          </label>
          <input
            id="tournament-closes"
            type="datetime-local"
            className="bx-field [color-scheme:dark]"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            aria-describedby="tournament-closes-hint"
            data-testid="tournament-closes"
          />
          <p id="tournament-closes-hint" className="mt-1.5 text-[12px] text-ink-muted">
            {t('fieldClosesAtHint')}
          </p>
        </div>

        <div>
          <p className="bx-eyebrow mb-2" id="tournament-seeding-label">
            {t('fieldSeeding')}
          </p>
          <div className="bx-seg" role="group" aria-labelledby="tournament-seeding-label">
            {(['check_in', 'random'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={seeding === s}
                onClick={() => setSeeding(s)}
                data-testid={`tournament-seeding-${s}`}
              >
                {t(`seeding.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="tournament-rules">
            {t('fieldRules')}
          </label>
          <input
            id="tournament-rules"
            type="url"
            dir="ltr"
            className="bx-field"
            value={rulesUrl}
            onChange={(e) => setRulesUrl(e.target.value)}
            maxLength={500}
            placeholder="https://"
            data-testid="tournament-rules"
          />
        </div>

        <div className="min-[700px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="tournament-description">
            {t('fieldDescription')}
          </label>
          <textarea
            id="tournament-description"
            className="bx-field min-h-[110px] py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            data-testid="tournament-description"
          />
        </div>

        {isFederation ? (
          <fieldset className="m-0 grid gap-3 border-0 p-0 min-[700px]:col-span-2">
            <legend className="bx-eyebrow mb-2">{t('federationTitle')}</legend>
            <label className="bx-check justify-self-start">
              <input
                type="checkbox"
                checked={sanctioned}
                onChange={(e) => setSanctioned(e.target.checked)}
                data-testid="tournament-sanctioned"
              />
              <span>{t('fieldSanctioned')}</span>
            </label>
            <label className="bx-check justify-self-start">
              <input
                type="checkbox"
                checked={rankingPoints}
                onChange={(e) => setRankingPoints(e.target.checked)}
                data-testid="tournament-ranking-points"
              />
              <span>{t('fieldRankingPoints')}</span>
            </label>
          </fieldset>
        ) : null}
      </div>

      {saved ? (
        <div data-testid="tournament-saved">
          <Notice icon={<Check className="bx-icon" aria-hidden />}>{t('savedNotice')}</Notice>
        </div>
      ) : null}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="tournament-form-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}

      <Button
        variant={props.mode === 'create' ? 'gold' : 'ink'}
        type="submit"
        disabled={submitting || (props.mode === 'create' && !org) || name.trim().length < 3}
        className="justify-self-start"
        data-testid="tournament-save"
      >
        {props.mode === 'create' ? (
          <Trophy className="bx-icon" aria-hidden />
        ) : (
          <Save className="bx-icon" aria-hidden />
        )}
        {submitting ? t('saving') : props.mode === 'create' ? t('createCta') : t('saveCta')}
      </Button>
    </form>
  );
}
