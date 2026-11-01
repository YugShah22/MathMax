/**
 * Next.js Edge Middleware — Phase 3.1 Authentication Guard
 *
 * Intercepts requests to protected routes (/teacher/dashboard, /student/dashboard)
 * before the page bundle is delivered. Redirects unauthenticated visitors to
 * /auth immediately, without leaking the React bundle or causing a client-side
 * flash.
 *
 * Token storage strategy (Phase 3.1):
 *   Tokens are stored in sessionStorage (browser-only, tab-isolated).
 *   Edge Middleware runs in the Node.js Edge Runtime and cannot access
 *   sessionStorage (which is client-side only). Therefore, middleware performs
 *   a lightweight check using a non-HttpOnly browser cookie (mm_auth_hint) that
 *   is set by the client after successful login. This cookie does NOT carry the
 *   JWT itself — only a boolean presence hint. The actual JWT in sessionStorage
 *   is validated by FastAPI on every API call.
 *
 * This provides a meaningful UX guard (no dashboard flash for visitors) while
 * preserving the existing tab-isolation design. A full HttpOnly cookie migration
 * can replace sessionStorage in a future phase.
 *
 * Protected routes:
 *   /teacher/dashboard  → requires mm_auth_hint cookie (teacher or any auth)
 *   /student/dashboard  → requires mm_auth_hint cookie (student or any auth)
 */

import { NextResponse } from 'next/server';

/** Routes that require authentication. */
const PROTECTED_PREFIXES = ['/teacher/dashboard', '/student/dashboard'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check the lightweight auth-hint cookie set by the client after login.
  const authHint = request.cookies.get('mm_auth_hint');
  if (!authHint || !authHint.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/teacher/dashboard/:path*', '/student/dashboard/:path*'],
};

