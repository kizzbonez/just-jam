import * as OTPAuth from "otpauth";

const PERIOD_SECONDS = 30;
const ISSUER = "ToneLink";

function totpFor(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function newTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** The `otpauth://` URI an authenticator app scans. */
export function totpUri(secretBase32: string, email: string): string {
  return totpFor(secretBase32, email).toString();
}

interface TotpCheck {
  secret: string;
  code: string;
  /** Time step of the last accepted code, to refuse a replay. */
  lastCounter: number | null;
  now?: number;
}

/**
 * Returns the time step the code belongs to, or null when it is wrong or was
 * already used. One step of clock drift either way is tolerated.
 */
export function checkTotp(check: TotpCheck): number | null {
  const timestamp = check.now ?? Date.now();
  const delta = totpFor(check.secret, "check").validate({
    token: check.code,
    timestamp,
    window: 1,
  });
  if (delta === null) return null;
  const counter = Math.floor(timestamp / 1000 / PERIOD_SECONDS) + delta;
  if (check.lastCounter !== null && counter <= check.lastCounter) return null;
  return counter;
}

export function currentTotpCode(secretBase32: string, now = Date.now()): string {
  return totpFor(secretBase32, "check").generate({ timestamp: now });
}
