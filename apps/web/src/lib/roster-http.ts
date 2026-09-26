import 'server-only';
import { NextResponse } from 'next/server';
import { ProfileError, RosterError, type CurrentUser } from '@beat-em-all/db/queries';
import { getCurrentUser } from './current-user';

export const NO_STORE = { 'cache-control': 'no-store' } as const;

/** The signed-in player, or a 401 response when there is none (or the profile is unfinished). */
export async function resolveMe(): Promise<
  { me: CurrentUser; response?: undefined } | { me?: undefined; response: NextResponse }
> {
  try {
    return { me: await getCurrentUser() };
  } catch (err) {
    const incomplete = (err as { code?: string } | null)?.code === 'profile_incomplete';
    return {
      response: NextResponse.json(
        incomplete
          ? { error: 'profile_incomplete', message: 'Finish your profile first.' }
          : { error: 'unauthorized', message: 'Sign in to continue.' },
        { status: incomplete ? 403 : 401 },
      ),
    };
  }
}

/** Parse a JSON body; `null` when it isn't JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function invalidBody(message = 'Some fields are invalid.') {
  return NextResponse.json({ error: 'invalid_body', message }, { status: 400 });
}

/** Roster / profile failures carry a stable code and a user-safe message; anything else is a 500. */
export function rosterErrorResponse(err: unknown, where: string) {
  if (err instanceof RosterError || err instanceof ProfileError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
  }
  console.error(`[${where}] failed`, err);
  return NextResponse.json(
    { error: 'internal', message: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}
