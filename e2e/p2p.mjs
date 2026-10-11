// End-to-end test of the links between players' browsers. Real Chromium
// instances join one room. Their audio must travel over a WebRTC link between
// them and not through the relay, must fall back to the relay when no link can
// form, and must still reach a player who has no link at all.
//
//   docker compose up -d --build      (SETUP_TOKEN set in .env for a fresh stack)
//   npm run e2e:p2p
import { RELAY_WS_URL } from "./lib/env.mjs";
import { check, checkHearing, checkPeer, finish, launch, round, START_PROFILE, TONES } from "./lib/hearing.mjs";
import { enterRoom } from "./lib/players.mjs";
import { call, closeRoom, createRoom, diagnostics, ensureStudio, signInPlayer } from "./lib/studio.mjs";

const LINK_TIMEOUT_MS = 20_000;

/** Resolves once this page's audio from every other player comes over a link. */
const waitLinked = (page) =>
  page.waitForFunction(
    () => {
      const peers = window.__tonelink?.diagnostics().peers ?? [];
      return peers.length > 0 && peers.every((peer) => peer.stats?.route === "p2p");
    },
    null,
    { timeout: LINK_TIMEOUT_MS },
  );

function checkLinked(label, snapshot) {
  const stats = snapshot.peers[0]?.stats;
  check(`${label}: audio comes over the link`, stats?.route === "p2p", `route ${stats?.route}`);
  const rtt = stats?.p2pRttMs;
  check(`${label}: link round trip is measured and short`, typeof rtt === "number" && rtt < 30, `${round(rtt, 2)} ms`);
}

/** How many audio packets this page handed to the relay over a stretch of time. */
async function relayedDuring(page, ms) {
  const before = (await diagnostics(page)).link.relayedPackets;
  await page.waitForTimeout(ms);
  return (await diagnostics(page)).link.relayedPackets - before;
}

const byName = (snapshot, name) => snapshot.peers.find((peer) => peer.name === name);

const host = await launch("host");
const guest = await launch("guest");
const third = await launch("keys");
const players = [host, guest, third];
let roomSlug = null;
try {
  const studio = await ensureStudio(host.context);
  await signInPlayer(host.context, studio, { name: "Ana Marquez", instrument: "Lead Guitar" });
  await signInPlayer(guest.context, studio, { name: "Bo Tanaka", instrument: "Bass" });
  await signInPlayer(third.context, studio, { name: "Cy Reyes", instrument: "Keys" });
  for (const player of players) {
    await call(player.context, "/api/profile/audio", { data: START_PROFILE, method: "PUT" });
  }
  const room = await createRoom(host.context, { name: "E2E links", visibility: "PRIVATE", maxPeers: 4 });
  roomSlug = room.slug;
  console.log(`room ${room.slug}`);

  // Two players, both able to link.
  await enterRoom(host.page, room.slug);
  await enterRoom(guest.page, room.slug);
  await Promise.all([waitLinked(host.page), waitLinked(guest.page)]);
  await host.page.waitForTimeout(7000);
  const hostView = await diagnostics(host.page);
  const guestView = await diagnostics(guest.page);
  console.log(
    `link rtt ${round(hostView.peers[0].stats.p2pRttMs, 2)} ms, relay rtt ${round(hostView.link.rttMs, 2)} ms`,
  );
  checkLinked("host", hostView);
  checkLinked("guest", guestView);
  checkHearing("host hears guest over the link (Opus 256k)", hostView, { tones: TONES.guest, kbps: 256 });
  checkHearing("guest hears host over the link (Opus 256k)", guestView, { tones: TONES.host, kbps: 256 });
  const idle = await relayedDuring(host.page, 2000);
  check("linked: the relay carries none of the audio", idle === 0, `${idle} packets in 2 s`);

  // Uncompressed audio is the heaviest thing a link has to carry.
  for (const player of [host, guest]) await player.page.selectOption("#live-codec", "PCM16");
  await host.page.waitForTimeout(5000);
  checkHearing("host hears guest over the link (PCM 16-bit)", await diagnostics(host.page), { tones: TONES.guest, kbps: 1536 });
  checkHearing("guest hears host over the link (PCM 16-bit)", await diagnostics(guest.page), { tones: TONES.host, kbps: 1536 });
  for (const player of [host, guest]) await player.page.selectOption("#live-codec", "OPUS");

  // A third player who cannot link: the relay carries audio to and from them
  // only, while the first two stay on their link.
  await enterRoom(third.page, room.slug, { query: "?p2p=off" });
  await host.page.waitForTimeout(8000);
  const mixedHost = await diagnostics(host.page);
  const mixedThird = await diagnostics(third.page);
  check("mixed: host still linked to guest", byName(mixedHost, "Bo Tanaka")?.stats?.route === "p2p");
  check("mixed: host reaches the third player through the relay", byName(mixedHost, "Cy Reyes")?.stats?.route === "relay");
  checkPeer("host hears guest over the link, in a mixed room", byName(mixedHost, "Bo Tanaka"), { tones: TONES.guest, kbps: 256 });
  checkPeer("host hears the third player through the relay", byName(mixedHost, "Cy Reyes"), { tones: TONES.keys, kbps: 256 });
  checkPeer("third player hears host through the relay", byName(mixedThird, "Ana Marquez"), { tones: TONES.host, kbps: 256 });
  checkPeer("third player hears guest through the relay", byName(mixedThird, "Bo Tanaka"), { tones: TONES.guest, kbps: 256 });
  const busy = await relayedDuring(host.page, 2000);
  check("mixed: the relay carries the host's audio again", busy > 300, `${busy} packets in 2 s`);
  await third.page.goto("about:blank");
  await host.page.waitForFunction(() => window.__tonelink?.diagnostics().peers.length === 1, null, { timeout: 10_000 });
  // The packet counter is refreshed four times a second: let it catch up first.
  await host.page.waitForTimeout(1000);
  const quiet = await relayedDuring(host.page, 2000);
  check("mixed: the relay is idle again once that player leaves", quiet === 0, `${quiet} packets in 2 s`);

  // A player whose route to the relay is the slow fallback still links directly.
  if (RELAY_WS_URL) {
    await enterRoom(guest.page, room.slug, { query: "?transport=websocket" });
    await Promise.all([waitLinked(host.page), waitLinked(guest.page)]);
    await host.page.waitForTimeout(7000);
    const viaSocket = await diagnostics(guest.page);
    check("fallback route: guest reaches the relay by WebSocket", viaSocket.transport === "websocket", viaSocket.transport);
    checkLinked("fallback route: guest", viaSocket);
    checkHearing("host hears a WebSocket guest over the link", await diagnostics(host.page), { tones: TONES.guest, kbps: 256 });
    checkHearing("WebSocket guest hears host over the link", viaSocket, { tones: TONES.host, kbps: 256 });
  } else {
    console.log("SKIP  fallback route scenario: RELAY_WS_URL is not set");
  }

  // One side refusing to link leaves both on the relay, with audio intact.
  await enterRoom(guest.page, room.slug, { query: "?p2p=off" });
  await host.page.waitForTimeout(8000);
  const relayedHost = await diagnostics(host.page);
  check("no link: host falls back to the relay", relayedHost.peers[0]?.stats?.route === "relay", relayedHost.peers[0]?.stats?.route);
  checkHearing("host hears guest through the relay", relayedHost, { tones: TONES.guest, kbps: 256 });
  checkHearing("guest hears host through the relay", await diagnostics(guest.page), { tones: TONES.host, kbps: 256 });
} catch (error) {
  check("test ran to the end", false, error.message);
} finally {
  if (roomSlug) await closeRoom(host.context, roomSlug).catch(() => undefined);
  for (const player of players) await player.browser.close();
}

finish("P2P E2E");
