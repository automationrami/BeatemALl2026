import 'server-only';
import { NextResponse } from 'next/server';
import { AdminError, VenueOwnerError } from '@beat-em-all/db/queries';
import { ProfileIncompleteError } from './current-user';

const VENUE_STATUS: Record<VenueOwnerError['code'], number> = {
  not_found: 404,
  forbidden: 403,
  captain_only: 403,
  name_taken: 409,
  unknown_game: 400,
  invalid_hours: 400,
  reason_required: 400,
  invalid_state: 409,
  cancel_window_passed: 409,
  insert_failed: 500,
};

const ADMIN_STATUS: Record<AdminError['code'], number> = {
  forbidden: 403,
  not_found: 404,
  invalid_state: 409,
  reason_required: 400,
};

/**
 * Map the venue-owner / admin domain errors (and an unfinished profile) to
 * `{ error, message }` responses. Anything else is logged and returned as a 500.
 */
export function venueErrorResponse(err: unknown, where: string) {
  if (err instanceof VenueOwnerError && err.code !== 'insert_failed') {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: VENUE_STATUS[err.code] ?? 400 },
    );
  }
  if (err instanceof AdminError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: ADMIN_STATUS[err.code] ?? 400 },
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

export async function readJson(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export const INVALID_JSON = Symbol('invalid_json');

export function invalidJsonResponse() {
  return NextResponse.json(
    { error: 'invalid_json', message: 'Request body must be JSON.' },
    { status: 400 },
  );
}

export function invalidBodyResponse(issues: unknown) {
  return NextResponse.json(
    { error: 'invalid_body', message: 'Some fields are missing or invalid.', issues },
    { status: 400 },
  );
}
