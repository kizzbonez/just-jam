import "server-only";
import type { RegisterInput } from "@/features/auth/schemas";
import { startSession } from "@/features/auth/server/sessions";
import { inviteMatches, loadSettings } from "@/features/auth/server/studio-settings";
import type { StudioSettings } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/crypto/password";
import { db } from "@/lib/db";
import { conflict, forbidden } from "@/lib/http/errors";
import type { RequestMeta } from "@/lib/http/route";

function assertMayRegister(settings: StudioSettings, inviteCode: string | undefined): void {
  if (!settings.setupCompletedAt) throw forbidden("This studio has not been set up yet.");
  if (settings.registrationMode === "CLOSED") {
    throw forbidden("Registration is closed on this studio.");
  }
  if (settings.registrationMode === "INVITE" && !inviteMatches(settings, inviteCode)) {
    throw forbidden("That invite code is not valid.");
  }
}

export async function register(input: RegisterInput, meta: RequestMeta): Promise<void> {
  assertMayRegister(await loadSettings(), input.inviteCode);
  const taken = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (taken) {
    throw conflict("Check the highlighted fields.", {
      email: "An account with this email already exists.",
    });
  }
  const user = await db.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      audioPreference: { create: {} },
    },
  });
  await startSession(user.id, meta);
}
