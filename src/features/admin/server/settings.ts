import "server-only";
import type { AdminSettingsInput } from "@/features/admin/schemas";
import type { RegistrationModeValue } from "@/features/auth/constants";
import { loadSettings, saveRegistration } from "@/features/auth/server/studio-settings";
import { randomToken } from "@/lib/crypto/digest";
import { db } from "@/lib/db";

export interface AdminOverview {
  mode: RegistrationModeValue;
  hasInviteCode: boolean;
  members: number;
  openRooms: number;
}

export async function loadAdminOverview(): Promise<AdminOverview> {
  const [settings, members, openRooms] = await Promise.all([
    loadSettings(),
    db.user.count(),
    db.room.count({ where: { closedAt: null } }),
  ]);
  return {
    mode: settings.registrationMode,
    hasInviteCode: settings.inviteCodeHash !== null,
    members,
    openRooms,
  };
}

/**
 * Saves the registration policy. An invite code is issued when asked for, or
 * when invite-only is chosen and none exists yet. It is returned once; only
 * its hash is stored.
 */
export async function updateRegistration(input: AdminSettingsInput) {
  const settings = await loadSettings();
  const needsCode = input.registrationMode === "INVITE" && !settings.inviteCodeHash;
  const inviteCode = input.rotateInvite || needsCode ? randomToken(9) : undefined;
  await saveRegistration(input.registrationMode, inviteCode);
  return { inviteCode: inviteCode ?? null };
}
