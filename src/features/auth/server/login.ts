import "server-only";
import type { LoginInput } from "@/features/auth/schemas";
import { assertNotLocked, clearFailures, recordFailure } from "@/features/auth/server/lockout";
import { writeMfaCookie } from "@/features/auth/server/session-cookie";
import { signMfaToken } from "@/features/auth/server/session-token";
import { startSession } from "@/features/auth/server/sessions";
import { burnPasswordCheck, verifyPassword } from "@/lib/crypto/password";
import { db } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/http/errors";
import type { RequestMeta } from "@/lib/http/route";

const invalidCredentials = () => unauthorized("Email or password is incorrect.");

export interface LoginResult {
  /** True when the password was right but a second factor is still required. */
  mfaRequired: boolean;
}

/** Finishes a sign-in once every required factor has been checked. */
export async function completeLogin(userId: string, meta: RequestMeta): Promise<void> {
  await clearFailures(userId);
  await startSession(userId, meta);
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<LoginResult> {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await burnPasswordCheck(input.password);
    throw invalidCredentials();
  }
  assertNotLocked(user);
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    await recordFailure(user);
    throw invalidCredentials();
  }
  if (user.disabledAt) throw forbidden("This account has been disabled.");
  if (user.totpEnabledAt) {
    await writeMfaCookie(await signMfaToken(user.id));
    return { mfaRequired: true };
  }
  await completeLogin(user.id, meta);
  return { mfaRequired: false };
}
