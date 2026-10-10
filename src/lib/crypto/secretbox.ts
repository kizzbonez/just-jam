import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** One key per purpose, so a ciphertext cannot be replayed in another context. */
function keyFor(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", env().AUTH_SECRET, "tonelink", purpose, 32));
}

/** AES-256-GCM. Output is `iv | tag | ciphertext`, base64url encoded. */
export function seal(plain: string, purpose: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function open(sealed: string, purpose: string): string | null {
  const raw = Buffer.from(sealed, "base64url");
  if (raw.length <= IV_BYTES + TAG_BYTES) return null;
  const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose), raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  try {
    const body = raw.subarray(IV_BYTES + TAG_BYTES);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
