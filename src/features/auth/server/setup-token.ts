import "server-only";
import { loadSettings } from "@/features/auth/server/studio-settings";
import { digestsMatch, randomToken, sha256Hex } from "@/lib/crypto/digest";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

function banner(token: string): string {
  const line = "=".repeat(64);
  return [
    "",
    line,
    "  ToneLink first-run setup",
    `  Open ${env().APP_URL}/setup and enter this one-time token:`,
    "",
    `      ${token}`,
    "",
    "  It stops working as soon as the owner account is created.",
    line,
    "",
  ].join("\n");
}

/**
 * On a fresh install, prints a one-time token to the server log. Only someone
 * who can read that log can create the owner account, so an unconfigured
 * studio is never claimable by whoever reaches the URL first.
 */
export async function announceSetupToken(): Promise<void> {
  const settings = await loadSettings();
  if (settings.setupCompletedAt) return;
  const token = env().SETUP_TOKEN ?? randomToken(18);
  await db.studioSettings.update({
    where: { id: settings.id },
    data: { setupTokenHash: sha256Hex(token) },
  });
  console.log(banner(token));
}

export async function setupTokenMatches(token: string): Promise<boolean> {
  const settings = await loadSettings();
  if (settings.setupCompletedAt || !settings.setupTokenHash) return false;
  return digestsMatch(settings.setupTokenHash, sha256Hex(token.trim()));
}
