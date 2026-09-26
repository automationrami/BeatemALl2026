/**
 * PATCH /api/admin/venues/[slug] — approve or reject a venue application (A-01).
 * Body `{ action: 'approve' | 'reject', reason? }` (reason required to reject). Approving a
 * venue also approves its pending organisation. Staff only.
 * Errors: 400 invalid_body | reason_required, 403 forbidden, 404 not_found, 409 invalid_state.
 */

import { NextResponse } from 'next/server';
import { reviewVenueApplication } from '@beat-em-all/db/queries';
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
    const result = await reviewVenueApplication({
      slug,
      action: parsed.data.action,
      reason: parsed.data.reason ?? null,
      reviewerUserId: me.userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return venueErrorResponse(err, 'PATCH /api/admin/venues/[slug]');
  }
}
