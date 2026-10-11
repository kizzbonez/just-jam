import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/constants";
import { readSessionToken } from "@/features/auth/server/session-token";
import { isSecureOrigin } from "@/lib/env";
import { contentSecurityPolicy } from "@/lib/http/csp";
import { accessFor } from "@/lib/http/route-access";

async function hasSessionToken(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? (await readSessionToken(token)) !== null : false;
}

function toLogin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  if (pathname !== "/lobby") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

function unauthorized(): NextResponse {
  const error = { code: "unauthorized", message: "Sign in to continue." };
  return NextResponse.json({ error }, { status: 401 });
}

const notFound = () => new NextResponse("Not found", { status: 404 });

/** The dev server's own endpoints (hot reload, error overlay) must stay reachable. */
function isDevTooling(pathname: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return pathname.startsWith("/_next/") || pathname.startsWith("/__nextjs");
}

/** What an anonymous visitor gets for a path that needs a session. */
async function gate(request: NextRequest): Promise<NextResponse> {
  if (isDevTooling(request.nextUrl.pathname)) return NextResponse.next();
  const access = accessFor(request.nextUrl.pathname);
  if (access === "blocked") return notFound();
  if (access === "public" || (await hasSessionToken(request))) return NextResponse.next();
  if (access === "api") return unauthorized();
  // Only real pages lead to the sign-in screen. Anything else simply does not exist.
  return access === "page" ? toLogin(request) : notFound();
}

/**
 * First gate in front of every page, API route and static asset: nothing but
 * the home page and the sign-in screens is served without a signed session
 * cookie. This only checks the signature. Pages and route handlers then
 * confirm the session row is still live, which is what makes revocation
 * effective.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = await gate(request);
  if (response.status !== 200) response.headers.set("Cache-Control", "no-store");
  response.headers.set("Content-Security-Policy", contentSecurityPolicy());
  if (isSecureOrigin()) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = {
  // Only build assets and the icon skip the gate. The image optimizer does not,
  // or it would serve protected files from /public to anyone.
  matcher: ["/((?!_next/static|favicon.ico|icon.svg).*)"],
};
