// Regenerates every screenshot used by the guide and the README, from a live
// stack with three players actually playing.
//
//   SETUP_TOKEN set in .env, then: docker compose up -d --build
//   npm run shots
//
// On a fresh stack this also walks the first-run wizard, so its screens are
// captured too. On an existing one those three pictures are left as they are.
import { copyFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE_URL } from "./lib/env.mjs";
import { enterRoom, launchPlayer } from "./lib/players.mjs";
import { writeManifest } from "./lib/png.mjs";
import { loadAllImages, rackBox, tidyMix } from "./lib/shot-helpers.mjs";
import { call, closeRoom, createRoom, loadState, signInOwner, signInPlayer, studioIsFresh } from "./lib/studio.mjs";
import { writeRiff } from "./lib/tone.mjs";
import { runSetupWizard } from "./lib/wizard.mjs";

const OUT = "public/guide";
/** The home page is public, so its pictures live outside the protected guide folder. */
const LANDING = "public/landing";
const LANDING_SHOTS = ["console", "mixer", "telemetry", "transport", "lobby"];
const VIEWPORT = { width: 1440, height: 900 };

const BAND = [
  { role: "host", name: "Ana Marquez", instrument: "Lead Guitar", notes: [[196, 294], [220, 330], [247, 370], [294, 440], [247, 370], [220, 330]] },
  { role: "bass", name: "Bo Tanaka", instrument: "Bass", notes: [[98, 98], [98, 98], [110, 110], [73, 73]] },
  { role: "keys", name: "Cleo Park", instrument: "Keys", notes: [[392, 494], [440, 554], [494, 587], [440, 523], [392, 494]] },
];

const START_PROFILE = {
  inputDeviceId: null, inputLabel: null, outputDeviceId: null, channelMode: "STEREO",
  codec: "OPUS", frameMicros: 5000, bitrateKbps: 256, bufferMode: "AUTO", bufferMs: 20,
};

const shooter = (page) => async (name, options = {}) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...options });
  console.log("shot", name);
};

async function captureSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  try {
    if (!(await studioIsFresh(context))) return loadState();
    const page = await context.newPage();
    return await runSetupWizard(page, shooter(page));
  } finally {
    await browser.close();
  }
}

async function captureSignedOut() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  const shot = shooter(page);
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#email").waitFor();
  await shot("login");
  await page.goto(`${BASE_URL}/register`);
  await page.locator("#email").waitFor();
  await shot("register");
  await page.goto(`${BASE_URL}/`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot("landing");
  await loadAllImages(page);
  await shot("landing-full", { fullPage: true });
  await browser.close();
}

async function captureOwner(state) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  await signInOwner(context, state);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: "Save policy" }).waitFor();
  await shooter(page)("admin");
  await browser.close();
}

async function captureConsole(host, room) {
  const { page } = host;
  const shot = shooter(page);
  await tidyMix(page);
  await page.waitForTimeout(24_000); // let the telemetry trace fill in
  await shot("console", { fullPage: true });
  await shot("interface", { fullPage: true, clip: await rackBox(page, ["Interface"]) });
  await shot("transport", { fullPage: true, clip: await rackBox(page, ["Transport", "Jitter buffer"]) });
  await shot("mixer", { fullPage: true, clip: await rackBox(page, ["Mixer"]) });
  await shot("telemetry", { fullPage: true, clip: await rackBox(page, ["Telemetry"]) });

  const second = await host.context.newPage();
  const shotSecond = shooter(second);
  for (const [path, name, ready] of [
    ["/lobby", "lobby", "Your rooms"],
    ["/history", "history", "Session log"],
    ["/profile", "profile", "Audio defaults"],
    ["/security", "security", "Signed-in devices"],
    [`/docs/latency`, "guide", "Where the delay comes from"],
  ]) {
    await second.goto(BASE_URL + path);
    await second.getByText(ready, { exact: false }).first().waitFor();
    await shotSecond(name);
  }
  await second.goto(`${BASE_URL}/lobby`);
  await second.getByRole("button", { name: "New room" }).click();
  await second.fill("#room-name", "Sunday writing session");
  await shotSecond("create-room");
  console.log(`room ${room.slug} captured`);
}

const state = await captureSetup();
if (!state) throw new Error("No studio state. Start a fresh stack with SETUP_TOKEN set in .env.");
await captureSignedOut();
await captureOwner(state);

const players = [];
/** Rooms opened by this run, closed again at the end: [context, slug]. */
const created = [];
for (const member of BAND) {
  const wav = writeRiff(`e2e/.tmp/${member.role}.wav`, { notes: member.notes });
  players.push({ ...(await launchPlayer({ role: member.role, wav, viewport: VIEWPORT })), member });
}
try {
  for (const player of players) {
    await signInPlayer(player.context, state, player.member);
    await call(player.context, "/api/profile/audio", { data: START_PROFILE, method: "PUT" });
  }
  const [host, bass, keys] = players;
  const room = await createRoom(host.context, { name: "Thursday rehearsal", visibility: "PRIVATE", pin: "4821", maxPeers: 6 });
  const open = await createRoom(host.context, { name: "Open mic night", visibility: "PUBLIC", maxPeers: 8 });
  const clinic = await createRoom(bass.context, { name: "Low end clinic", visibility: "PUBLIC", maxPeers: 4 });
  created.push([host.context, room.slug], [host.context, open.slug], [bass.context, clinic.slug]);

  await keys.page.goto(`${BASE_URL}/room/${room.slug}`);
  await keys.page.locator("#room-pin").waitFor();
  await shooter(keys.page)("room-gate");

  await enterRoom(host.page, room.slug);
  await enterRoom(bass.page, room.slug, { pin: "4821" });
  await enterRoom(keys.page, room.slug, { pin: "4821" });
  await captureConsole(host, room);
} finally {
  for (const [context, slug] of created) await closeRoom(context, slug).catch(() => undefined);
  for (const player of players) await player.browser.close();
}

mkdirSync(LANDING, { recursive: true });
for (const name of LANDING_SHOTS) copyFileSync(`${OUT}/${name}.png`, `${LANDING}/${name}.png`);

const manifest = writeManifest(OUT, "src/features/docs/shots.json");
console.log(`${Object.keys(manifest).length} screenshots in ${OUT}`);
