/**
 * GET   /api/manage/tournaments/[slug] — organiser console data (tournament, entries, bracket).
 * PATCH /api/manage/tournaments/[slug] — either edit fields or run a transition:
 *   - `{ action: 'open_registration' | 'close_registration' | 'start' | 'complete' | 'cancel' }`
 *   - any subset of the create fields (not organizationSlug) — draft / registration open only.
 *
 * Owner / admin / organizer of the verified organisation only.
 * Errors: 400 invalid_json | invalid_body | game_not_found | federation_only | starts_in_past |
 *   closes_after_start | min_above_max, 403 forbidden, 404 not_found, 409 invalid_state |
 *   not_editable | below_entries | entries_exist | not_enough_teams | final_not_played.
 */

import { NextResponse } from 'next/server';
import {
  loadTournamentConsole,
  transitionTournament,
  updateTournament,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  INVALID_JSON,
  invalidBodyResponse,
  invalidJsonResponse,
  readJson,
  tournamentActionSchema,
  tournamentAdminErrorResponse,
  updateTournamentSchema,
} from '@/lib/tournament-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  try {
    const me = await getCurrentUser();
    const data = await loadTournamentConsole(slug, me.userId);
    return NextResponse.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'GET /api/manage/tournaments/[slug]');
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();

  const isAction = typeof body === 'object' && body !== null && 'action' in body;
  try {
    const me = await getCurrentUser();
    if (isAction) {
      const parsed = tournamentActionSchema.safeParse(body);
      if (!parsed.success) return invalidBodyResponse(parsed.error);
      const { tournament } = await transitionTournament(slug, parsed.data.action, me.userId);
      return NextResponse.json({ tournament });
    }
    const parsed = updateTournamentSchema.safeParse(body);
    if (!parsed.success) return invalidBodyResponse(parsed.error);
    const tournament = await updateTournament(slug, parsed.data, me.userId);
    return NextResponse.json({ tournament });
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'PATCH /api/manage/tournaments/[slug]');
  }
}
