// Browser-side helpers shared by the end-to-end test and the screenshot run.
import { chromium } from "playwright";
import { BASE_URL } from "./env.mjs";

/**
 * Starts a Chromium whose microphone is a WAV file played in a loop. Each
 * player needs a browser of their own because the fake input is a
 * process-wide flag.
 */
export async function launchPlayer({ role, wav, viewport = { width: 1440, height: 900 } }) {
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${process.cwd()}/${wav}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`[${role} pageerror]`, error.message));
  page.on("dialog", (dialog) => dialog.accept());
  return { role, browser, context, page };
}

const isLive = () => window.__tonelink?.diagnostics().phase === "live";

/**
 * Goes through the entry screen and arms the input, as a player would.
 * `query` is appended to the room address, for example "?transport=websocket".
 */
export async function enterRoom(page, slug, { pin = null, query = "" } = {}) {
  await page.goto(`${BASE_URL}/room/${slug}${query}`);
  await page.getByRole("button", { name: "Enter room" }).waitFor();
  if (pin) await page.fill("#room-pin", pin);
  await page.getByRole("button", { name: "Enter room" }).click();
  await page.waitForFunction(isLive, null, { timeout: 20_000 });
  await page.getByRole("button", { name: "Arm input" }).click();
  await page.getByRole("button", { name: "Disarm" }).waitFor({ timeout: 15_000 });
}
