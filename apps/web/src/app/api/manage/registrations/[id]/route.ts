/**
 * PATCH /api/manage/registrations/[id] — organiser action on one entry (M-04, M-05).
 *
 * Body: { action: 'disqualify' | 'reinstate' | 'check_in' | 'undo_check_in', reason? }
 * (`reason` required for disqualify). Allowed until the bracket is generated.
 * Team leaders are notified on disqualify / reinstate.
 * Errors: 400 invalid_json | invalid_body | reason_required, 403 forbidden, 404 not_found,
 *   409 invalid_state | not_confirmed | tournament_full.
 */

import { NextResponse } from 'next/server';
import { updateEntry } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  INVALID_JSON,
  entryActionSchema,
  invalidBodyResponse,
  invalidJsonResponse,
  readJson,
  tournamentAdminErrorResponse,
} from '@/lib/tournament-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = entryActionSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error);

  try {
    const me = await getCurrentUser();
    const registration = await updateEntry({
      registrationId: id,
      action: parsed.data.action,
      reason: parsed.data.reason ?? null,
      byUserId: me.userId,
    });
    return NextResponse.json({ registration });
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'PATCH /api/manage/registrations/[id]');
  }
}
