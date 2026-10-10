import "server-only";
import type { RegistrationModeValue } from "@/features/auth/constants";
import type { StudioSettings } from "@/generated/prisma/client";
import { digestsMatch, sha256Hex } from "@/lib/crypto/digest";
import { db } from "@/lib/db";

const SETTINGS_ID = 1;

/** The settings row always exists after the first read. */
export function loadSettings(): Promise<StudioSettings> {
  return db.studioSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });
}

let setupDone = false;

/** Setup never reverts, so a positive answer is remembered for the process. */
export async function isSetupComplete(): Promise<boolean> {
  if (setupDone) return true;
  const settings = await loadSettings();
  setupDone = settings.setupCompletedAt !== null;
  return setupDone;
}

export function inviteMatches(settings: StudioSettings, code: string | undefined): boolean {
  if (!settings.inviteCodeHash || !code) return false;
  return digestsMatch(settings.inviteCodeHash, sha256Hex(code.trim()));
}

export interface RegistrationPolicy {
  mode: RegistrationModeValue;
  hasInviteCode: boolean;
}

export async function registrationPolicy(): Promise<RegistrationPolicy> {
  const settings = await loadSettings();
  return { mode: settings.registrationMode, hasInviteCode: settings.inviteCodeHash !== null };
}

export async function saveRegistration(
  mode: RegistrationModeValue,
  inviteCode?: string,
): Promise<void> {
  await db.studioSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      registrationMode: mode,
      ...(inviteCode ? { inviteCodeHash: sha256Hex(inviteCode) } : {}),
    },
  });
}
