import { z } from "zod";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Signs session cookies and derives the key that encrypts TOTP secrets. */
  AUTH_SECRET: z.string().min(32),
  /** Origin the studio is served from. Decides the cookie `Secure` flag. */
  APP_URL: z.url().default("http://127.0.0.1:3410"),
  /** Extra origins accepted for state-changing requests, comma separated. */
  ALLOWED_ORIGINS: z.string().default(""),
  /** WebTransport endpoint browsers connect to (HTTP/3 over UDP). */
  RELAY_PUBLIC_URL: z.url().default("https://127.0.0.1:4433"),
  /**
   * WebSocket fallback endpoint (wss://...), for players who cannot reach the
   * UDP port. Unset turns the fallback off.
   */
  RELAY_WS_URL: z.preprocess(
    blankToUndefined,
    z
      .url()
      .refine((value) => /^wss?:\/\//.test(value), "must start with ws:// or wss://")
      .optional(),
  ),
  /** Relay admin API, reachable only on the internal network. */
  RELAY_ADMIN_URL: z.url().default("http://127.0.0.1:8081"),
  /** Shared with the relay: signs room tickets and guards its admin API. */
  RELAY_SHARED_SECRET: z.string().min(32),
  /** Optional fixed first-run token. A random one is printed when unset. */
  SETUP_TOKEN: z.preprocess(blankToUndefined, z.string().min(16).optional()),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Validated lazily so `next build` can import modules without a runtime env. */
export function env(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}

export function isSecureOrigin(): boolean {
  return env().APP_URL.startsWith("https://");
}
