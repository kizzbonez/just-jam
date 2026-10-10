import type { JWTPayload } from "jose";
import { MFA_TTL_SECONDS, SESSION_TTL_SECONDS } from "@/features/auth/constants";
import { signToken, verifyToken } from "@/lib/crypto/tokens";
import { env } from "@/lib/env";

const SESSION_AUDIENCE = "tonelink:session";
const MFA_AUDIENCE = "tonelink:mfa";

export interface SessionClaims extends JWTPayload {
  sub: string;
  /** Row id in the Session table. The row, not the token, decides validity. */
  sid: string;
}

export function signSessionToken(userId: string, sessionId: string): Promise<string> {
  return signToken(
    { sub: userId, sid: sessionId },
    { secret: env().AUTH_SECRET, audience: SESSION_AUDIENCE, ttlSeconds: SESSION_TTL_SECONDS },
  );
}

export function readSessionToken(token: string): Promise<SessionClaims | null> {
  return verifyToken<SessionClaims>(token, {
    secret: env().AUTH_SECRET,
    audience: SESSION_AUDIENCE,
  });
}

/** Short-lived proof that the password step passed and a second factor is due. */
export function signMfaToken(userId: string): Promise<string> {
  return signToken(
    { sub: userId },
    { secret: env().AUTH_SECRET, audience: MFA_AUDIENCE, ttlSeconds: MFA_TTL_SECONDS },
  );
}

export async function readMfaToken(token: string): Promise<string | null> {
  const claims = await verifyToken(token, { secret: env().AUTH_SECRET, audience: MFA_AUDIENCE });
  return claims?.sub ?? null;
}
