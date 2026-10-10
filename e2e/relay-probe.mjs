// Smoke test for the QUIC relay from a real browser: two WebTransport sessions
// join a room, exchange control messages, measure a datagram round trip and
// forward an audio datagram. Needs the relay running with compose.dev.yaml.
//
//   docker compose -f compose.yaml -f compose.dev.yaml up -d relay
//   node e2e/relay-probe.mjs
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { chromium } from "playwright";

function readEnv(file) {
  const entries = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]);
  return Object.fromEntries(entries);
}

const env = readEnv(".env");
const ADMIN = process.env.RELAY_ADMIN_URL ?? "http://127.0.0.1:8081";
const ORIGIN_PAGE = `${env.APP_URL}/login`;
const key = new TextEncoder().encode(env.RELAY_SHARED_SECRET);

const certResponse = await fetch(`${ADMIN}/internal/cert`, {
  headers: { authorization: `Bearer ${env.RELAY_SHARED_SECRET}` },
});
const cert = await certResponse.json();

/** Runs in the page. Returns a plain report object. */
async function probe({ url, hash, tickets }) {
  const pin = Uint8Array.from(atob(hash), (char) => char.charCodeAt(0));
  const within = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms)),
    ]);

  async function connect(token) {
    const wt = new WebTransport(`${url}/jam?ticket=${token}`, {
      serverCertificateHashes: [{ algorithm: "sha-256", value: pin }],
    });
    await within(wt.ready, 8000, "ready");
    const control = await wt.createBidirectionalStream();
    const writer = control.writable.getWriter();
    await writer.write(new TextEncoder().encode('{"t":"hello"}\n'));
    const lines = control.readable.pipeThrough(new TextDecoderStream()).getReader();
    let buffered = "";
    async function nextMessage() {
      while (!buffered.includes("\n")) {
        const { value, done } = await within(lines.read(), 5000, "control line");
        if (done) throw new Error("control stream ended");
        buffered += value;
      }
      const index = buffered.indexOf("\n");
      const line = buffered.slice(0, index);
      buffered = buffered.slice(index + 1);
      return JSON.parse(line);
    }
    return {
      wt,
      nextMessage,
      datagrams: wt.datagrams.readable.getReader(),
      send: wt.datagrams.writable.getWriter(),
      maxDatagram: wt.datagrams.maxDatagramSize,
    };
  }

  const a = await connect(tickets[0]);
  const welcomeA = await a.nextMessage();
  const b = await connect(tickets[1]);
  const welcomeB = await b.nextMessage();
  const joined = await a.nextMessage();

  const rtts = [];
  for (let i = 0; i < 20; i++) {
    const started = performance.now();
    await a.send.write(new Uint8Array([0xb1, 0, i, 0, 0, 0, 0, 0, 0, 0]));
    const { value } = await within(a.datagrams.read(), 3000, "pong");
    if (value[0] !== 0xb2 || value[2] !== i) throw new Error("unexpected pong");
    rtts.push(performance.now() - started);
  }

  const audio = new Uint8Array(10 + 240);
  audio[0] = 0xa1;
  audio[1] = 0xff; // a client must not be able to choose its own source slot
  audio[10] = 42;
  await a.send.write(audio);
  const forwarded = (await within(b.datagrams.read(), 3000, "forwarded audio")).value;

  a.wt.close();
  const left = await b.nextMessage();
  b.wt.close();
  rtts.sort((x, y) => x - y);
  return {
    welcomeA,
    welcomeB,
    joined,
    left,
    maxDatagram: a.maxDatagram,
    rttMedianMs: Number(rtts[10].toFixed(2)),
    rttMaxMs: Number(rtts[19].toFixed(2)),
    forwarded: { type: forwarded[0], slot: forwarded[1], length: forwarded.length, payload: forwarded[10] },
  };
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(ORIGIN_PAGE);
  const room = `probe-${Date.now()}`;
  const mint = (sub, host) =>
    new SignJWT({ sub, room, name: sub, inst: "Probe", host, max: 4, ava: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setAudience("tonelink:relay")
      .setExpirationTime("60s")
      .sign(key);
  const report = await page.evaluate(probe, {
    url: env.RELAY_PUBLIC_URL,
    hash: cert.hash,
    tickets: [await mint("probe-a", true), await mint("probe-b", false)],
  });
  console.log(JSON.stringify(report, null, 1));
  const ok =
    report.welcomeA.slot === 1 &&
    report.welcomeB.peers.length === 1 &&
    report.joined.t === "peer-joined" &&
    report.left.t === "peer-left" &&
    report.forwarded.type === 0xa1 &&
    report.forwarded.slot === 1 &&
    report.forwarded.payload === 42;
  console.log(ok ? "RELAY PROBE PASS" : "RELAY PROBE FAIL");
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
