import "server-only";
import type { SetupBeginInput, SetupCompleteInput } from "@/features/auth/schemas";
import { issueRecoveryCodes } from "@/features/auth/server/recovery-codes";
import { startSession } from "@/features/auth/server/sessions";
import { setupTokenMatches } from "@/features/auth/server/setup-token";
import { checkTotp } from "@/features/auth/server/totp";
import {
  offerEnrollment,
  readEnrollment,
  sealTotpSecret,
  type EnrollmentOffer,
} from "@/features/auth/server/totp-enrollment";
import { randomToken, sha256Hex } from "@/lib/crypto/digest";
import { hashPassword } from "@/lib/crypto/password";
import { db } from "@/lib/db";
import { badRequest, forbidden } from "@/lib/http/errors";
import type { RequestMeta } from "@/lib/http/route";

export async function assertSetupToken(token: string): Promise<void> {
  if (!(await setupTokenMatches(token))) {
    throw forbidden("That setup token is not valid. Check the server log for the current one.");
  }
}

/** Step one: validates the token and hands back an authenticator enrollment. */
export async function beginSetup(input: SetupBeginInput): Promise<EnrollmentOffer> {
  await assertSetupToken(input.token);
  return offerEnrollment(input.email);
}

export interface SetupResult {
  recoveryCodes: string[];
  /** Present when the studio is invite-only: the code new members will need. */
  inviteCode: string | null;
}

function confirmedSecret(input: SetupCompleteInput): { secret: string; counter: number } {
  const secret = readEnrollment(input.enrollment, input.email);
  if (!secret) throw badRequest("The authenticator step expired. Start it again.");
  const counter = checkTotp({ secret, code: input.code, lastCounter: null });
  if (counter === null) {
    throw badRequest("Check the highlighted fields.", { code: "That code is not valid." });
  }
  return { secret, counter };
}

/**
 * Step two: creates the owner with two-factor already on, stores the studio
 * policy and closes setup, all in one transaction.
 */
export async function completeSetup(
  input: SetupCompleteInput,
  meta: RequestMeta,
): Promise<SetupResult> {
  await assertSetupToken(input.token);
  const { secret, counter } = confirmedSecret(input);
  const passwordHash = await hashPassword(input.password);
  const inviteCode = input.registrationMode === "INVITE" ? randomToken(9) : null;
  const outcome = await db.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        role: "ADMIN",
        totpSecret: sealTotpSecret(secret),
        totpEnabledAt: new Date(),
        totpLastCounter: counter,
        audioPreference: { create: {} },
      },
    });
    await tx.studioSettings.update({
      where: { id: 1 },
      data: {
        setupCompletedAt: new Date(),
        setupTokenHash: null,
        registrationMode: input.registrationMode,
        inviteCodeHash: inviteCode ? sha256Hex(inviteCode) : null,
      },
    });
    return { ownerId: owner.id, recoveryCodes: await issueRecoveryCodes(owner.id, tx) };
  });
  await startSession(outcome.ownerId, meta);
  return { recoveryCodes: outcome.recoveryCodes, inviteCode };
}
