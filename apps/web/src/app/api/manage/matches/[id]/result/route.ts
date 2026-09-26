/**
 * POST /api/manage/matches/[id]/result — organiser records a tournament match score (M-07).
 *
 * Body: { homeScore, awayScore, notes? } — integers, no draws. The winner advances; the next
 * match is created (and its teams notified) once both of its teams are known. Re-posting
 * corrects a result until the next match has one.
 * Errors: 400 invalid_json | invalid_body | same_score, 403 forbidden, 404 not_found,
 *   409 invalid_state | match_not_ready | result_locked.
 */

import { NextResponse } from 'next/server';
import { recordMatchResult } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  INVALID_JSON,
  invalidBodyResponse,
  invalidJsonResponse,
  matchResultSchema,
  readJson,
  tournamentAdminErrorResponse,
} from '@/lib/tournament-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = matchResultSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error);

  try {
    const me = await getCurrentUser();
    const result = await recordMatchResult({
      matchId: id,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      notes: parsed.data.notes ?? null,
      byUserId: me.userId,
    });
    return NextResponse.json({ result });
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'POST /api/manage/matches/[id]/result');
  }
}
