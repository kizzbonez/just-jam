// End-to-end jam test. Two real Chromium instances, each with its own fake
// audio interface playing a known pair of tones, join one room through the
// relay. The test then checks what each side actually hears: the right pitch
// on the right channel, at the expected bitrate, without loss or dropouts.
//
//   docker compose up -d --build      (SETUP_TOKEN set in .env for a fresh stack)
//   npm run e2e
import { enterRoom, launchPlayer } from "./lib/players.mjs";
import { call, createRoom, diagnostics, ensureStudio, signInPlayer } from "./lib/studio.mjs";
import { writeStereoTone } from "./lib/tone.mjs";

const TONES = {
  host: { leftHz: 440, rightHz: 660 },
  guest: { leftHz: 880, rightHz: 1320 },
};
/** One analyser bin at 48 kHz with a 1024-point FFT. */
const BIN_HZ = 47;
const PIN = "4821";
/** Settings are remembered per player, so every run starts from the same ones. */
const START_PROFILE = {
  inputDeviceId: null,
  inputLabel: null,
  outputDeviceId: null,
  channelMode: "STEREO",
  codec: "OPUS",
  frameMicros: 5000,
  bitrateKbps: 256,
  bufferMode: "AUTO",
  bufferMs: 20,
};

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const launch = (role) =>
  launchPlayer({
    role,
    wav: writeStereoTone(`e2e/.tmp/${role}.wav`, TONES[role]),
    viewport: { width: 1440, height: 960 },
  });

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
  const held = `${round(stats.bufferMs)} ms held, target ${round(stats.targetMs)} ms`;
  check(`${label}: buffer follows its target`, Math.abs(stats.bufferMs - stats.targetMs) < 15, held);
  check(`${label}: target stays modest`, stats.targetMs < 80, held);
}

const host = await launch("host");
const guest = await launch("guest");
try {
  const studio = await ensureStudio(host.context);
  await signInPlayer(host.context, studio, { name: "Ana Marquez", instrument: "Lead Guitar" });
  await signInPlayer(guest.context, studio, { name: "Bo Tanaka", instrument: "Bass" });
  for (const player of [host, guest]) {
    await call(player.context, "/api/profile/audio", { data: START_PROFILE, method: "PUT" });
  }
  const room = await createRoom(host.context, {
    name: "E2E jam",
    visibility: "PRIVATE",
    pin: PIN,
    maxPeers: 4,
  });
  console.log(`room ${room.slug}`);

  await enterRoom(host.page, room.slug);
  await enterRoom(guest.page, room.slug, PIN);
  await host.page.waitForTimeout(7000);

  const heardByHost = await diagnostics(host.page);
  const heardByGuest = await diagnostics(guest.page);
  console.log(
    `link: host rtt ${round(heardByHost.link.rttMs, 2)} ms, guest rtt ${round(heardByGuest.link.rttMs, 2)} ms, max datagram ${heardByHost.maxDatagram}`,
  );
  checkHearing("host hears guest (Opus 256k)", heardByHost, { tones: TONES.guest, kbps: 256 });
  checkHearing("guest hears host (Opus 256k)", heardByGuest, { tones: TONES.host, kbps: 256 });

  // Change transport while playing: uncompressed 16-bit PCM, 5 ms frames.
  for (const player of [host, guest]) {
    await player.page.selectOption("#live-codec", "PCM16");
  }
  await host.page.waitForTimeout(5000);
  const pcmHost = await diagnostics(host.page);
  const pcmGuest = await diagnostics(guest.page);
  check("pcm: profile switched", pcmHost.profile.codec === "PCM16" && pcmHost.peers[0].state.codec === "PCM16");
  checkHearing("host hears guest (PCM 16-bit)", pcmHost, { tones: TONES.guest, kbps: 1536 });
  checkHearing("guest hears host (PCM 16-bit)", pcmGuest, { tones: TONES.host, kbps: 1536 });

  // A codec that cannot fit a 5 ms frame in one datagram shortens the frame.
  await host.page.selectOption("#live-codec", "PCM24");
  await host.page.waitForTimeout(3000);
  const pcm24 = await diagnostics(guest.page);
  check(
    "pcm24: frame shortened to 2.5 ms",
    pcm24.peers[0].state.codec === "PCM24" && pcm24.peers[0].state.frameMicros === 2500,
    `${pcm24.peers[0].state.codec} at ${pcm24.peers[0].state.frameMicros / 1000} ms`,
  );
  check(
    "pcm24: still the right pitch",
    near(pcm24.peers[0].toneHz[0], TONES.host.leftHz) && near(pcm24.peers[0].toneHz[1], TONES.host.rightHz),
    pcm24.peers[0].toneHz.map((hz) => round(hz, 0)).join(" / "),
  );
  check("pcm24: receive bitrate", Math.abs(pcm24.peers[0].stats.receivedKbps - 2304) / 2304 < 0.12, `${round(pcm24.peers[0].stats.receivedKbps, 0)} kbps, want about 2304`);

  // Fixed buffer: turning adaptive tuning off pins the target to the saved value.
  await guest.page.getByRole("switch", { name: "Adaptive tuning" }).click();
  await guest.page.waitForTimeout(2500);
  const manual = await diagnostics(guest.page);
  check(
    "manual buffer: target pinned",
    manual.profile.bufferMode === "MANUAL" && Math.abs(manual.peers[0].stats.targetMs - manual.profile.bufferMs) < 0.5,
    `target ${round(manual.peers[0].stats.targetMs)} ms, setting ${manual.profile.bufferMs} ms`,
  );

  // Mute stops the stream at the source and the other side sees it.
  await host.page.getByRole("switch", { name: "Mute" }).click();
  await host.page.waitForTimeout(2500);
  const muted = await diagnostics(guest.page);
  check("mute: peer state published", muted.peers[0].state.muted === true);
  check("mute: nothing received", muted.peers[0].stats.receivedKbps < 1, `${round(muted.peers[0].stats.receivedKbps, 1)} kbps`);
  await host.page.getByRole("switch", { name: "Mute" }).click();
  await host.page.waitForTimeout(2500);
  const unmuted = await diagnostics(guest.page);
  check("unmute: audio resumes", unmuted.peers[0].stats.playing && unmuted.peers[0].stats.receivedKbps > 1000);

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
