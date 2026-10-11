// Drives the first-run setup wizard through the UI, the way an owner would,
// taking screenshots of its steps on the way.
import * as OTPAuth from "otpauth";
import { BASE_URL, SETUP_TOKEN } from "./env.mjs";
import { OWNER, saveState } from "./studio.mjs";

const totp = (secret) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate();

/**
 * Completes setup on a fresh install and stores the owner's credentials for
 * later runs. `shot(name)` is called at each step worth a picture.
 */
export async function runSetupWizard(page, shot) {
  await page.goto(`${BASE_URL}/setup`);
  await page.locator("#token").waitFor();
  await shot("setup");

  await page.fill("#token", SETUP_TOKEN);
  await page.getByRole("button", { name: "Unlock setup" }).click();

  await page.locator("#email").waitFor();
  await page.fill("#email", OWNER.email);
  await page.fill("#displayName", OWNER.displayName);
  await page.fill("#password", OWNER.password);
  await page.fill("#confirmPassword", OWNER.password);
  await shot("setup-owner");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: /Invite only/ }).waitFor({ state: "attached" });
  await shot("setup-policy");
  await page.getByRole("button", { name: "Continue" }).click();

  // The authenticator step shows the key in a <code> element next to the QR.
  await page.locator("#totp-code").waitFor();
  const secret = (await page.locator("form code").innerText()).trim();
  await page.fill("#totp-code", totp(secret));
  await page.getByRole("button", { name: "Confirm and turn on" }).click();

  const invite = page.getByLabel("invite code", { exact: true });
  await invite.waitFor();
  const state = saveState({ owner: OWNER, totpSecret: secret, invite: (await invite.innerText()).trim() });
  await page.getByRole("button", { name: "Enter the studio" }).click();
  await page.waitForURL(/\/profile/);
  return state;
}
