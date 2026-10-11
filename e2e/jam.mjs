// End-to-end jam test. Two real Chromium instances, each with its own fake
// audio interface playing a known pair of tones, join one room through the
// relay. The test then checks what each side actually hears: the right pitch
// on the right channel, at the expected bitrate, without loss or dropouts.
// Links between the browsers are off here; p2p.mjs covers those.
//
//   docker compose up -d --build      (SETUP_TOKEN set in .env for a fresh stack)
//   npm run e2e
import { RELAY_WS_URL } from "./lib/env.mjs";
import { check, checkHearing, finish, launch, near, round, START_PROFILE, TONES } from "./lib/hearing.mjs";
import { enterRoom } from "./lib/players.mjs";
import { call, closeRoom, createRoom, diagnostics, ensureStudio, signInPlayer } from "./lib/studio.mjs";

const PIN = "4821";
/** Links between browsers are tested in p2p.mjs. Here all audio goes through the relay. */
const RELAY_ONLY = "?p2p=off";

const host = await launch("host");
const guest = await launch("guest");
let roomSlug = null;
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
  roomSlug = room.slug;
  console.log(`room ${room.slug}`);

  await enterRoom(host.page, room.slug, { query: RELAY_ONLY });
  await enterRoom(guest.page, room.slug, { pin: PIN, query: RELAY_ONLY });
  await host.page.waitForTimeout(7000);

  const heardByHost = await diagnostics(host.page);
  const heardByGuest = await diagnostics(guest.page);
  console.log(
    `link: host rtt ${round(heardByHost.link.rttMs, 2)} ms, guest rtt ${round(heardByGuest.link.rttMs, 2)} ms, max datagram ${heardByHost.maxDatagram}`,
  );
  check("relay only: no link is made when links are off", heardByHost.peers[0]?.stats?.route === "relay");
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

  // One player on the WebSocket fallback, one on QUIC, in the same room.
  if (RELAY_WS_URL) {
    await call(guest.context, "/api/profile/audio", { data: START_PROFILE, method: "PUT" });
    await call(host.context, "/api/profile/audio", { data: START_PROFILE, method: "PUT" });
    await host.page.selectOption("#live-codec", "OPUS");
    await enterRoom(guest.page, room.slug, { query: "?transport=websocket&p2p=off" });
    await host.page.waitForTimeout(7000);
    const viaQuic = await diagnostics(host.page);
    const viaSocket = await diagnostics(guest.page);
    check("fallback: guest is on WebSocket, host on QUIC", viaSocket.transport === "websocket" && viaQuic.transport === "quic", `${viaQuic.transport} / ${viaSocket.transport}`);
    checkHearing("QUIC host hears WebSocket guest", viaQuic, { tones: TONES.guest, kbps: 256 });
    checkHearing("WebSocket guest hears QUIC host", viaSocket, { tones: TONES.host, kbps: 256 });
    console.log(`fallback link: guest rtt ${round(viaSocket.link.rttMs, 2)} ms via ${RELAY_WS_URL}`);
  } else {
    console.log("SKIP  fallback scenario: RELAY_WS_URL is not set");
  }

  // The host removes the guest; the guest must be told why and kept out.
  await host.page.getByRole("button", { name: /Remove Bo Tanaka/ }).click();
  await guest.page.getByText("The host removed you from this room.").waitFor({ timeout: 10_000 });
  check("kick: guest is told why", true);
  check("kick: no rejoin offered", (await guest.page.getByRole("button", { name: "Rejoin" }).count()) === 0);
  await host.page.waitForFunction(() => window.__tonelink?.diagnostics().peers.length === 0, null, {
    timeout: 10_000,
  });
  check("kick: host's mixer is empty again", true);

  // Closing the room ends the host's own session with the reason.
  const closed = await closeRoom(host.context, room.slug);
  roomSlug = null;
  check("close: host can close the room", closed.status === 200);
  await host.page.getByText("The host closed this room.").waitFor({ timeout: 10_000 });
  check("close: everyone in the room is told", true);
} catch (error) {
  check("test ran to the end", false, error.message);
} finally {
  if (roomSlug) await closeRoom(host.context, roomSlug).catch(() => undefined);
  await host.browser.close();
  await guest.browser.close();
}

finish("JAM E2E");
