import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/constants";
import { readSessionToken } from "@/features/auth/server/session-token";
import { contentSecurityPolicy } from "@/lib/http/csp";

const PUBLIC_PAGES = new Set(["/login", "/register", "/setup"]);
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/mfa",
  "/api/auth/register",
  "/api/setup/",
  "/api/health",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PAGES.has(pathname) || PUBLIC_API.some((prefix) => pathname.startsWith(prefix));
}

async function hasSessionToken(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? (await readSessionToken(token)) !== null : false;
}

function deny(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    const error = { code: "unauthorized", message: "Sign in to continue." };
    return NextResponse.json({ error }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/" && pathname !== "/lobby") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

/**
 * First gate in front of every page, API route and static asset: nothing but
 * the sign-in screens is served without a signed session cookie. This only
 * checks the signature. Pages and route handlers then confirm the session row
 * is still live, which is what makes revocation effective.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const open = isPublic(request.nextUrl.pathname) || (await hasSessionToken(request));
  const response = open ? NextResponse.next() : deny(request);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
