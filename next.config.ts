import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), display-capture=()",
  },
];

const ENGINE_DIR = "public/engine";

/**
 * A fingerprint of the built audio engine. The worker and worklets load by
 * URL from /public, where a CDN may tell browsers to keep them for hours. The
 * page puts this value in those URLs, so a new build always loads the engine
 * it was built with and never an older copy.
 */
function engineVersion(): string {
  if (!existsSync(ENGINE_DIR)) return "dev";
  const hash = createHash("sha256");
  for (const name of readdirSync(ENGINE_DIR).sort()) {
    hash.update(name).update(readFileSync(`${ENGINE_DIR}/${name}`));
  }
  return hash.digest("hex").slice(0, 12);
}

const cache = (value: string) => [{ key: "Cache-Control", value }];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  env: { NEXT_PUBLIC_ENGINE_VERSION: engineVersion() },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Files behind sign-in must never sit in a shared cache, where they
      // would be served without the sign-in check.
      { source: "/engine/:path*", headers: cache("private, no-cache") },
      { source: "/guide/:path*", headers: cache("private, max-age=3600") },
      { source: "/landing/:path*", headers: cache("public, max-age=86400") },
    ];
  },
};

export default nextConfig;
