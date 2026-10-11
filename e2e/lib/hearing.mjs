// What the two-browser tests share: the tones each player sends, the settings
// every run starts from, and the checks on what a player actually hears.
import { launchPlayer } from "./players.mjs";
import { writeStereoTone } from "./tone.mjs";

export const TONES = {
  host: { leftHz: 440, rightHz: 660 },
  guest: { leftHz: 880, rightHz: 1320 },
  keys: { leftHz: 1760, rightHz: 2200 },
};
/** One analyser bin at 48 kHz with a 1024-point FFT. */
const BIN_HZ = 47;
/** Settings are remembered per player, so every run starts from the same ones. */
export const START_PROFILE = {
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
export function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

/** Prints the verdict and sets the exit code. */
export function finish(name) {
  console.log(failures === 0 ? `\n${name} PASS` : `\n${name} FAIL (${failures})`);
  process.exitCode = failures === 0 ? 0 : 1;
}

export const launch = (role) =>
  launchPlayer({
    role,
    wav: writeStereoTone(`e2e/.tmp/${role}.wav`, TONES[role]),
    viewport: { width: 1440, height: 960 },
  });

export const near = (actual, expected) => Math.abs(actual - expected) <= BIN_HZ;
export const round = (value, digits = 1) => Number(value?.toFixed?.(digits) ?? value);

/**
 * Checks what a listener hears from one other player: `peer` is that player's
 * entry in the listener's diagnostics snapshot.
 */
export function checkPeer(label, peer, { tones, kbps: expectedKbps }) {
  const stats = peer?.stats;
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

/** Checks what a listener hears from the one other player in the room. */
export function checkHearing(label, snapshot, expected) {
  check(`${label}: sees the other player`, snapshot.peers.length === 1);
  checkPeer(label, snapshot.peers[0], expected);
}
