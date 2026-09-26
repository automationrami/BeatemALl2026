/**
 * GET  /api/manage/tournaments — tournaments the caller can manage + their organisations.
 * POST /api/manage/tournaments — create a draft tournament (M-02).
 *
 * POST body: { organizationSlug, name, gameSlug, matchFormat: 'bo1'|'bo3'|'bo5', teamSize 1-10,
 *   maxTeams 2-128, minTeams? (default 2), entryFeeKwd ≥0, prizePoolKwd ≥0, startsAt (ISO),
 *   registrationClosesAt?, description?, rulesUrl?, isOfficialSanctioned?, awardsRankingPoints?,
 *   seedingStrategy?: 'check_in'|'random' }. Format is single elimination.
 * Errors: 400 invalid_json | invalid_body | game_not_found | federation_only | starts_in_past |
 *   closes_after_start | min_above_max, 403 forbidden | org_not_verified,
 *   404 organization_not_found.
 */

import { NextResponse } from 'next/server';
import {
  createTournament,
  listManagedTournaments,
  listTournamentOrganizations,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  INVALID_JSON,
  createTournamentSchema,
  invalidBodyResponse,
  invalidJsonResponse,
  readJson,
  tournamentAdminErrorResponse,
} from '@/lib/tournament-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const me = await getCurrentUser();
    const [organizations, tournaments] = await Promise.all([
      listTournamentOrganizations(me.userId),
      listManagedTournaments(me.userId),
    ]);
    return NextResponse.json(
      { organizations, tournaments },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'GET /api/manage/tournaments');
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error);

  try {
    const me = await getCurrentUser();
    const tournament = await createTournament(parsed.data, me.userId);
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'POST /api/manage/tournaments');
  }
}
