import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  OrganizationApplyError,
  TOURNAMENT_ADMIN_ERROR_STATUS,
  TournamentAdminError,
} from '@beat-em-all/db/queries';
import { ProfileIncompleteError } from './current-user';

export const INVALID_JSON = Symbol('invalid_json');

/** Parse a JSON body; an empty body is `{}`; malformed JSON is `INVALID_JSON`. */
export async function readJson(request: Request): Promise<unknown | typeof INVALID_JSON> {
  const raw = await request.text();
  if (raw.trim().length === 0) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return INVALID_JSON;
  }
}

export function invalidJsonResponse() {
  return NextResponse.json(
    { error: 'invalid_json', message: 'Request body is not valid JSON.' },
    { status: 400 },
  );
}

export function invalidBodyResponse(error: z.ZodError) {
  const flat = error.flatten();
  const first = Object.entries(flat.fieldErrors).find(([, msgs]) => msgs && msgs.length);
  const message = first
    ? `${first[0]}: ${(first[1] as string[])[0]}`
    : (flat.formErrors[0] ?? 'Some fields are invalid.');
  return NextResponse.json({ error: 'invalid_body', message, issues: flat }, { status: 400 });
}

/** Domain errors → `{ error, message }` with the right status; anything else is a 500. */
export function tournamentAdminErrorResponse(err: unknown, where: string) {
  if (err instanceof TournamentAdminError && err.code !== 'insert_failed') {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: TOURNAMENT_ADMIN_ERROR_STATUS[err.code] ?? 400 },
    );
  }
  if (err instanceof OrganizationApplyError && err.code !== 'insert_failed') {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.code === 'name_taken' ? 409 : 400 },
    );
  }
  if (err instanceof ProfileIncompleteError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
  }
  console.error(`[${where}] failed`, err);
  return NextResponse.json(
    { error: 'internal', message: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}

// ---------------------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------------------

const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((s) => new Date(s));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((s) => (s ? s : null));

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((s) => (s ? s : null))
  .refine((s) => s === null || /^https?:\/\/[^\s]+$/i.test(s), 'Must be an http(s) link.');

const fieldShape = {
  name: z.string().trim().min(3).max(80),
  gameSlug: z.string().trim().min(1).max(40),
  matchFormat: z.enum(['bo1', 'bo3', 'bo5']),
  teamSize: z.number().int().min(1).max(10),
  maxTeams: z.number().int().min(2).max(128),
  minTeams: z.number().int().min(2).max(128),
  entryFeeKwd: z.number().finite().min(0).max(10_000),
  prizePoolKwd: z.number().finite().min(0).max(1_000_000),
  startsAt: isoDate,
  registrationClosesAt: isoDate.nullish().transform((d) => d ?? null),
  description: optionalText(2000),
  rulesUrl: httpUrl,
  isOfficialSanctioned: z.boolean(),
  awardsRankingPoints: z.boolean(),
  seedingStrategy: z.enum(['check_in', 'random']),
};

export const createTournamentSchema = z.object({
  organizationSlug: z.string().trim().min(1).max(80),
  ...fieldShape,
  minTeams: fieldShape.minTeams.default(2),
  isOfficialSanctioned: fieldShape.isOfficialSanctioned.default(false),
  awardsRankingPoints: fieldShape.awardsRankingPoints.default(false),
  seedingStrategy: fieldShape.seedingStrategy.default('check_in'),
});

export const updateTournamentSchema = z.object(fieldShape).partial();

export const tournamentActionSchema = z.object({
  action: z.enum(['open_registration', 'close_registration', 'start', 'complete', 'cancel']),
});

export const entryActionSchema = z.object({
  action: z.enum(['disqualify', 'reinstate', 'check_in', 'undo_check_in']),
  reason: z.string().trim().max(500).nullish(),
});

export const matchResultSchema = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
  notes: z.string().trim().max(500).nullish(),
});

export const ORG_COUNTRIES = ['KW', 'KSA', 'AE', 'BH', 'QA', 'OM'] as const;

export const organizationApplicationSchema = z.object({
  name: z.string().trim().min(3).max(80),
  tier: z.enum(['community', 'brand']),
  countryCode: z.enum(ORG_COUNTRIES),
  description: optionalText(1000),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((s) => (s ? s : null))
    .refine((s) => s === null || z.string().email().safeParse(s).success, 'Invalid email.'),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ]{6,18}$/, 'Invalid phone number.'),
});
