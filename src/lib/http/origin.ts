import { env } from "@/lib/env";

function configuredOrigins(): string[] {
  const extra = env()
    .ALLOWED_ORIGINS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [new URL(env().APP_URL).origin, ...extra];
}

/**
 * CSRF check for state-changing requests. Browsers always send `Origin` on
 * them, so it must be present and match either the `Host` the request arrived
 * on or an explicitly configured origin.
 */
export function isTrustedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (host && parsed.host === host) return true;
  return configuredOrigins().includes(parsed.origin);
}
