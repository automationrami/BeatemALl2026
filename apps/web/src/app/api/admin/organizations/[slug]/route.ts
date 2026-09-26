/**
 * PATCH /api/admin/organizations/[slug] — approve or reject an organisation application (A-01).
 * Body `{ action: 'approve' | 'reject', reason? }` (reason required to reject). Any tier;
 * tournament organisers apply as community or brand. Staff only.
 * Errors: 400 invalid_body | reason_required, 403 forbidden, 404 not_found, 409 invalid_state.
 */

import { NextResponse } from 'next/server';
import { reviewOrganizationApplication } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { reviewSchema } from '@/lib/venue-schemas';
import {
  INVALID_JSON,
  invalidBodyResponse,
  invalidJsonResponse,
  readJson,
  venueErrorResponse,
} from '@/lib/venue-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error.flatten());

  try {
    const me = await getCurrentUser();
    const result = await reviewOrganizationApplication({
      slug,
      action: parsed.data.action,
      reason: parsed.data.reason ?? null,
      reviewerUserId: me.userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return venueErrorResponse(err, 'PATCH /api/admin/organizations/[slug]');
  }
}
