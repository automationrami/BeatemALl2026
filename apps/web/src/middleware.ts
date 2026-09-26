import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

/** Screens a signed-in account may use before finishing its profile. */
const PROFILE_FREE = /^\/(en|ar)\/(onboarding|sign-in|verify|auth)(\/|$)/;

export default function middleware(request: NextRequest) {
  // A signed-in account without a profile finishes sign-up before anything else (E1 US-1.2).
  if (request.cookies.get('bx-needs-profile')?.value === '1' && request.cookies.get('bx-session')) {
    const { pathname } = request.nextUrl;
    const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
    if (!PROFILE_FREE.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/onboarding`;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }
  return intl(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
