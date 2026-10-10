import "server-only";
import QRCode from "qrcode";
import { newTotpSecret, totpUri } from "@/features/auth/server/totp";
import { open, seal } from "@/lib/crypto/secretbox";

const PURPOSE = "totp-enrollment";
const SECRET_PURPOSE = "totp-secret";
const TTL_MS = 15 * 60 * 1000;

export interface EnrollmentOffer {
  /** Base32 secret, shown for manual entry. */
  secret: string;
  qrDataUrl: string;
  /** Encrypted, expiring copy of the secret that the confirm step sends back. */
  enrollment: string;
}

interface EnrollmentPayload {
  secret: string;
  email: string;
  expires: number;
}

/**
 * Starts enrollment without writing anything: the pending secret travels in an
 * encrypted blob, so an abandoned attempt leaves no half-configured account.
 */
export async function offerEnrollment(email: string): Promise<EnrollmentOffer> {
  const secret = newTotpSecret();
  const payload: EnrollmentPayload = { secret, email, expires: Date.now() + TTL_MS };
  const qrDataUrl = await QRCode.toDataURL(totpUri(secret, email), {
    margin: 1,
    width: 220,
    color: { dark: "#f4f4f5", light: "#00000000" },
  });
  return { secret, qrDataUrl, enrollment: seal(JSON.stringify(payload), PURPOSE) };
}

/** Returns the pending secret when the blob is intact, unexpired and for this email. */
export function readEnrollment(enrollment: string, email: string): string | null {
  const raw = open(enrollment, PURPOSE);
  if (!raw) return null;
  const payload = JSON.parse(raw) as EnrollmentPayload;
  if (payload.email !== email || payload.expires < Date.now()) return null;
  return payload.secret;
}

export const sealTotpSecret = (secret: string) => seal(secret, SECRET_PURPOSE);
export const openTotpSecret = (sealed: string) => open(sealed, SECRET_PURPOSE);
