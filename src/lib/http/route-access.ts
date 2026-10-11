/**
 * Decides, from the path alone, how the proxy treats a request.
 *
 *  - public:  served to anyone
 *  - page:    a studio page; anonymous visitors are sent to sign in
 *  - api:     an API route; anonymous callers get a 401
 *  - asset:   anything else; anonymous visitors get a 404, so the existence
 *             of protected files is not revealed and probes for things like
 *             /.env or /backup.sql get a plain "not found"
 *  - blocked: never served to anyone
 */
export type RouteAccess = "public" | "page" | "api" | "asset" | "blocked";

const PUBLIC_PAGES = new Set(["/", "/login", "/register", "/setup"]);

const PUBLIC_PREFIXES = [
  "/landing/",
  "/.well-known/security.txt",
  "/api/auth/login",
  "/api/auth/mfa",
  "/api/auth/register",
  "/api/setup/",
  "/api/health",
];

/** Sections of the studio. Each matches itself and everything beneath it. */
const STUDIO_PAGES = ["/lobby", "/room", "/profile", "/security", "/history", "/admin", "/docs"];

const isUnder = (pathname: string, root: string) =>
  pathname === root || pathname.startsWith(`${root}/`);

/** Dotfiles and dot-directories are never part of the app. */
const hasHiddenSegment = (pathname: string) =>
  pathname.split("/").some((segment) => segment.startsWith(".") && segment !== ".well-known");

export function accessFor(pathname: string): RouteAccess {
  if (PUBLIC_PAGES.has(pathname)) return "public";
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "public";
  if (hasHiddenSegment(pathname)) return "blocked";
  if (pathname.startsWith("/api/")) return "api";
  if (STUDIO_PAGES.some((root) => isUnder(pathname, root))) return "page";
  return "asset";
}
