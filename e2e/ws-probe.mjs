// Checks the WebSocket fallback as the outside world reaches it: two clients
// connect to RELAY_WS_URL (for example through a tunnel), join a throwaway
// room, and exchange packets. Nothing is written to the database; the room
// exists only in the relay's memory.
//
//   node e2e/ws-probe.mjs
import { SignJWT } from "jose";
import { readEnvFile } from "./lib/env.mjs";

const env = readEnvFile(".env");
const WS_URL = process.env.RELAY_WS_URL ?? env.RELAY_WS_URL;
const ORIGIN = new URL(env.APP_URL).origin;
if (!WS_URL) throw new Error("RELAY_WS_URL is not set in .env");

const key = new TextEncoder().encode(env.RELAY_SHARED_SECRET);
const room = `probe-${Date.now()}`;

const ticket = (sub, host) =>
  new SignJWT({ sub, room, name: sub, inst: "Probe", host, max: 4, ava: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("tonelink:relay")
    .setExpirationTime("60s")
    .sign(key);

/** Opens a client and returns helpers that resolve with the next message of each kind. */
async function connect(sub, host) {
  const url = `${WS_URL}/jam?ticket=${await ticket(sub, host)}`;
  const socket = new WebSocket(url, { headers: { origin: ORIGIN } });
  socket.binaryType = "arraybuffer";
  const queues = { text: [], binary: [] };
  const waiters = { text: [], binary: [] };
  socket.onmessage = (event) => {
    const kind = typeof event.data === "string" ? "text" : "binary";
    const value = kind === "text" ? JSON.parse(event.data) : new Uint8Array(event.data);
    const waiter = waiters[kind].shift();
    if (waiter) waiter(value);
    else queues[kind].push(value);
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error(`could not connect to ${WS_URL}`));
  });
  const next = (kind) =>
    new Promise((resolve, reject) => {
      if (queues[kind].length) return resolve(queues[kind].shift());
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${kind}`)), 6000);
      waiters[kind].push((value) => {
        clearTimeout(timer);
        resolve(value);
      });
    });
  return { socket, next };
}

const a = await connect("probe-a", true);
const welcome = await a.next("text");
const b = await connect("probe-b", false);
await b.next("text");
const joined = await a.next("text");

const rtts = [];
for (let i = 0; i < 20; i++) {
  const started = performance.now();
  a.socket.send(new Uint8Array([0xb1, 0, i, 0, 0, 0, 0, 0, 0, 0]));
  const pong = await a.next("binary");
  if (pong[0] !== 0xb2 || pong[2] !== i) throw new Error("unexpected pong");
  rtts.push(performance.now() - started);
}
rtts.sort((x, y) => x - y);

const audio = new Uint8Array(10 + 160);
audio[0] = 0xa1;
audio[1] = 0xff;
audio[10] = 42;
a.socket.send(audio);
const forwarded = await b.next("binary");

a.socket.close();
b.socket.close();

const ok =
  welcome.t === "welcome" &&
  joined.t === "peer-joined" &&
  forwarded[0] === 0xa1 &&
  forwarded[1] === 1 &&
  forwarded[10] === 42;
console.log(`endpoint   ${WS_URL}`);
console.log(`round trip median ${rtts[10].toFixed(1)} ms, worst ${rtts[19].toFixed(1)} ms (20 pings)`);
console.log(`forwarded  ${forwarded.length} bytes, sender slot stamped as ${forwarded[1]}`);
console.log(ok ? "WS PROBE PASS" : "WS PROBE FAIL");
process.exitCode = ok ? 0 : 1;
