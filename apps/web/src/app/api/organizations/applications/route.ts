/**
 * POST /api/organizations/applications — apply for an organiser account (M-01, ORG-1).
 *
 * Body: { name, tier: 'community'|'brand', countryCode, description?, contactEmail?, contactPhone }
 * Creates the organisation `pending` with the caller as owner and notifies Beat'Em All staff.
 * Errors: 400 invalid_json | invalid_body | invalid_name, 401 profile_incomplete,
 *         409 name_taken.
 */

import { NextResponse } from 'next/server';
import { applyForOrganization } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  INVALID_JSON,
  invalidBodyResponse,
  invalidJsonResponse,
  organizationApplicationSchema,
  readJson,
  tournamentAdminErrorResponse,
} from '@/lib/tournament-admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = organizationApplicationSchema.safeParse(body);
  if (!parsed.success) return invalidBodyResponse(parsed.error);

  try {
    const me = await getCurrentUser();
    const { organization } = await applyForOrganization({ userId: me.userId, ...parsed.data });
    return NextResponse.json(
      {
        organization: {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          tier: organization.tier,
          verificationStatus: organization.verificationStatus,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return tournamentAdminErrorResponse(err, 'POST /api/organizations/applications');
  }
}
