import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import {
  getAllowedRolesForPath,
  getDefaultRedirectForRole,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "./lib/auth";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const APP_ROOT_PREFIXES = ["/admin", "/docente", "/portal", "/api"];

function isAppRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/signin") {
    return true;
  }
  return APP_ROOT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAppRoute(pathname)) {
    const allowedRoles = getAllowedRolesForPath(pathname);

    if (allowedRoles) {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = token ? await verifySessionToken(token) : null;

      if (!session) {
        const loginUrl = new URL("/signin", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (!allowedRoles.includes(session.role)) {
        const fallbackPath = getDefaultRedirectForRole(session.role);
        return NextResponse.redirect(new URL(fallbackPath, request.url));
      }
    }

    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
