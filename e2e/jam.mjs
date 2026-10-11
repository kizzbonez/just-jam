// End-to-end jam test. Two real Chromium instances, each with its own fake
// audio interface playing a known pair of tones, join one room through the
// relay. The test then checks what each side actually hears: the right pitch
// on the right channel, at the expected bitrate, without loss or dropouts.
//
//   docker compose up -d --build      (SETUP_TOKEN set in .env for a fresh stack)
//   npm run e2e
import { chromium } from "playwright";
import { BASE_URL } from "./lib/env.mjs";
import { createRoom, diagnostics, ensureStudio, signInPlayer } from "./lib/studio.mjs";
import { writeStereoTone } from "./lib/tone.mjs";

const TONES = {
  host: { leftHz: 440, rightHz: 660 },
  guest: { leftHz: 880, rightHz: 1320 },
};
/** One analyser bin at 48 kHz with a 1024-point FFT. */
const BIN_HZ = 47;
const PIN = "4821";

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function launchPlayer(role) {
  const wav = writeStereoTone(`e2e/.tmp/${role}.wav`, TONES[role]);
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${process.cwd()}/${wav}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`[${role} pageerror]`, error.message));
  page.on("dialog", (dialog) => dialog.accept());
  return { role, browser, context, page };
}

async function enterRoom(player, slug, pin) {
  const { page } = player;
  await page.goto(`${BASE_URL}/room/${slug}`);
  await page.getByRole("button", { name: "Enter room" }).waitFor();
  if (pin) await page.fill("#room-pin", pin);
  await page.getByRole("button", { name: "Enter room" }).click();
  await page.getByRole("button", { name: "Arm input" }).waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => window.__tonelink?.diagnostics().phase === "live", null, {
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Arm input" }).click();
  await page.getByRole("button", { name: "Disarm" }).waitFor({ timeout: 15_000 });
}

const near = (actual, expected) => Math.abs(actual - expected) <= BIN_HZ;
const round = (value, digits = 1) => Number(value?.toFixed?.(digits) ?? value);

/** Checks what `listener` hears from the one other player in the room. */
function checkHearing(label, snapshot, { tones, kbps: expectedKbps }) {
  const peer = snapshot.peers[0];
  const stats = peer?.stats;
  check(`${label}: sees the other player`, snapshot.peers.length === 1);
  if (!stats) return check(`${label}: has receive stats`, false);
  check(`${label}: playback running`, stats.playing);
  check(
    `${label}: left channel pitch`,
    near(peer.toneHz[0], tones.leftHz),
    `${round(peer.toneHz[0], 0)} Hz, want ${tones.leftHz}`,
  );
  check(
    `${label}: right channel pitch`,
    near(peer.toneHz[1], tones.rightHz),
    `${round(peer.toneHz[1], 0)} Hz, want ${tones.rightHz}`,
  );
  check(`${label}: audible level`, peer.peaks[0] > 0.05 && peer.peaks[1] > 0.05, peer.peaks.map((p) => round(p, 3)).join(" / "));
  check(`${label}: no packet loss`, stats.lossPct < 0.5, `${round(stats.lossPct, 2)}%`);
  check(`${label}: no dropouts`, stats.underruns <= 1, `${stats.underruns} underruns`);
  check(
    `${label}: receive bitrate`,
    Math.abs(stats.receivedKbps - expectedKbps) / expectedKbps < 0.12,
    `${round(stats.receivedKbps, 0)} kbps, want about ${expectedKbps}`,
  );
  check(`${label}: buffer under 40 ms`, stats.bufferMs < 40, `${round(stats.bufferMs)} ms held, target ${round(stats.targetMs)} ms`);
}

const host = await launchPlayer("host");
const guest = await launchPlayer("guest");
try {
  const studio = await ensureStudio(host.context);
  await signInPlayer(host.context, studio, { name: "Ana Marquez", instrument: "Lead Guitar" });
  await signInPlayer(guest.context, studio, { name: "Bo Tanaka", instrument: "Bass" });
  const room = await createRoom(host.context, {
    name: "E2E jam",
    visibility: "PRIVATE",
    pin: PIN,
    maxPeers: 4,
  });
  console.log(`room ${room.slug}`);

  await enterRoom(host, room.slug, null);
  await enterRoom(guest, room.slug, PIN);
  await host.page.waitForTimeout(7000);

  const heardByHost = await diagnostics(host.page);
  const heardByGuest = await diagnostics(guest.page);
  console.log(
    `link: host rtt ${round(heardByHost.link.rttMs, 2)} ms, guest rtt ${round(heardByGuest.link.rttMs, 2)} ms, max datagram ${heardByHost.maxDatagram}`,
  );
  checkHearing("host hears guest (Opus 256k)", heardByHost, { tones: TONES.guest, kbps: 256 });
  checkHearing("guest hears host (Opus 256k)", heardByGuest, { tones: TONES.host, kbps: 256 });

  // The host removes the guest; the guest must be told why and kept out.
  await host.page.getByRole("button", { name: /Remove Bo Tanaka/ }).click();
  await guest.page.getByText("The host removed you from this room.").waitFor({ timeout: 10_000 });
  check("kick: guest is told why", true);
  check("kick: no rejoin offered", (await guest.page.getByRole("button", { name: "Rejoin" }).count()) === 0);
  await host.page.waitForFunction(() => window.__tonelink?.diagnostics().peers.length === 0, null, {
    timeout: 10_000,
  });
  check("kick: host's mixer is empty again", true);
} catch (error) {
  failures++;
  console.log("FAIL  test aborted:", error.message);
} finally {
  await host.browser.close();
  await guest.browser.close();
}

console.log(failures === 0 ? "\nJAM E2E PASS" : `\nJAM E2E FAIL (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
