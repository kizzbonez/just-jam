import { env } from "@/lib/env";

/**
 * Built per request rather than in next.config so the relay origin can come
 * from runtime configuration. Inline scripts stay allowed because the app
 * serves prerendered shells, which rules out per-request nonces.
 */
export function contentSecurityPolicy(): string {
  const relay = new URL(env().RELAY_PUBLIC_URL).origin;
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${relay}`,
    "worker-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
