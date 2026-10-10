import "server-only";
import { completeLogin } from "@/features/auth/server/login";
import { assertNotLocked, recordFailure } from "@/features/auth/server/lockout";
import { consumeRecoveryCode } from "@/features/auth/server/recovery-codes";
import { clearMfaCookie, readMfaCookie } from "@/features/auth/server/session-cookie";
import { readMfaToken } from "@/features/auth/server/session-token";
import { checkTotp } from "@/features/auth/server/totp";
import { openTotpSecret } from "@/features/auth/server/totp-enrollment";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http/errors";
import type { RequestMeta } from "@/lib/http/route";

const TOTP_PATTERN = /^\d{6}$/;

/** Accepts a current authenticator code and records its step against replay. */
export async function acceptTotp(user: User, code: string): Promise<boolean> {
  const secret = user.totpSecret ? openTotpSecret(user.totpSecret) : null;
  if (!secret) return false;
  const counter = checkTotp({ secret, code, lastCounter: user.totpLastCounter });
  if (counter === null) return false;
  await db.user.update({ where: { id: user.id }, data: { totpLastCounter: counter } });
  return true;
}

async function pendingUser(): Promise<User> {
  const token = await readMfaCookie();
  const userId = token ? await readMfaToken(token) : null;
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  if (!user || !user.totpEnabledAt) {
    throw unauthorized("Your sign-in expired. Enter your password again.");
  }
  return user;
}

/** Second login step. `code` is a 6-digit TOTP code or a recovery code. */
export async function verifyMfa(code: string, meta: RequestMeta): Promise<void> {
  const user = await pendingUser();
  assertNotLocked(user);
  const accepted = TOTP_PATTERN.test(code)
    ? await acceptTotp(user, code)
    : await consumeRecoveryCode(user.id, code);
  if (!accepted) {
    await recordFailure(user);
    throw unauthorized("That code is not valid.");
  }
  await clearMfaCookie();
  await completeLogin(user.id, meta);
}
