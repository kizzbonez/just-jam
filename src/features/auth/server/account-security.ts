import "server-only";
import type { PasswordChangeInput } from "@/features/auth/schemas";
import type { SessionUser } from "@/features/auth/server/current-user";
import { issueRecoveryCodes } from "@/features/auth/server/recovery-codes";
import { revokeOtherSessions } from "@/features/auth/server/sessions";
import { checkTotp } from "@/features/auth/server/totp";
import { readEnrollment, sealTotpSecret } from "@/features/auth/server/totp-enrollment";
import { hashPassword, verifyPassword } from "@/lib/crypto/password";
import { db } from "@/lib/db";
import { badRequest, forbidden } from "@/lib/http/errors";

/** Re-checks the password before a sensitive change on a signed-in account. */
export async function assertPassword(userId: string, password: string): Promise<void> {
  const row = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(password, row.passwordHash))) {
    throw badRequest("Check the highlighted fields.", { password: "Password is incorrect." });
  }
}

export async function changePassword(user: SessionUser, input: PasswordChangeInput) {
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(input.currentPassword, row.passwordHash))) {
    throw badRequest("Check the highlighted fields.", {
      currentPassword: "Current password is incorrect.",
    });
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  await revokeOtherSessions(user.id, user.sessionId);
}

interface TotpConfirmation {
  enrollment: string;
  code: string;
}

/** Turns two-factor on after the first code proves the authenticator works. */
export async function enableTotp(user: SessionUser, input: TotpConfirmation): Promise<string[]> {
  const secret = readEnrollment(input.enrollment, user.email);
  if (!secret) throw badRequest("The authenticator step expired. Start it again.");
  const counter = checkTotp({ secret, code: input.code, lastCounter: null });
  if (counter === null) {
    throw badRequest("Check the highlighted fields.", { code: "That code is not valid." });
  }
  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        totpSecret: sealTotpSecret(secret),
        totpEnabledAt: new Date(),
        totpLastCounter: counter,
      },
    });
    return issueRecoveryCodes(user.id, tx);
  });
}

export async function disableTotp(user: SessionUser, password: string): Promise<void> {
  if (user.role === "ADMIN") {
    throw forbidden("Owner accounts must keep two-factor authentication on.");
  }
  await assertPassword(user.id, password);
  await db.$transaction([
    db.recoveryCode.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, totpLastCounter: null },
    }),
  ]);
}

export async function regenerateRecoveryCodes(
  user: SessionUser,
  password: string,
): Promise<string[]> {
  if (!user.totpEnabled) throw badRequest("Turn on two-factor authentication first.");
  await assertPassword(user.id, password);
  return issueRecoveryCodes(user.id);
}
