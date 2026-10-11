// Helpers that put a studio into a known state for the end-to-end scripts.
// They talk to the same HTTP API the app uses, through a Playwright context,
// so cookies end up in the browser exactly as they would for a person.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as OTPAuth from "otpauth";
import { BASE_URL, SETUP_TOKEN } from "./env.mjs";

const STATE_FILE = "e2e/.tmp/state.json";

export const OWNER = {
  email: "owner@tonelink.test",
  displayName: "Studio Owner",
  password: "e2e-owner-password-1",
};

const totp = (secret) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate();

/** Calls the app's JSON API with the context's cookies. `method` defaults to POST. */
export async function call(context, path, { data, method = "POST" } = {}) {
  const response = await context.request.fetch(BASE_URL + path, {
    method,
    data,
    headers: { origin: BASE_URL },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const body = await response.json().catch(() => null);
  return { status: response.status(), body };
}

async function expectOk(result, what) {
  if (result.status !== 200) {
    throw new Error(`${what} failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body;
}

export function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : null;
}

export function saveState(state) {
  mkdirSync("e2e/.tmp", { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
  return state;
}

/** True while the studio has no owner. The setup token only verifies until then. */
export async function studioIsFresh(context) {
  if (!SETUP_TOKEN) return false;
  const probe = await call(context, "/api/setup/verify", { data: { token: SETUP_TOKEN } });
  return probe.status === 200;
}

/**
 * Makes sure the studio has an owner. On a fresh install it runs first-run
 * setup through the API with SETUP_TOKEN (set it in .env before starting the
 * stack) and remembers the owner's credentials in e2e/.tmp for later runs.
 */
export async function ensureStudio(context) {
  if (!(await studioIsFresh(context))) {
    const state = loadState();
    if (state) return state;
    throw new Error(`No e2e state in ${STATE_FILE}. Start a fresh stack with SETUP_TOKEN set in .env.`);
  }
  const draft = { token: SETUP_TOKEN, ...OWNER, registrationMode: "INVITE" };
  const offer = await expectOk(await call(context, "/api/setup/begin", { data: draft }), "setup begin");
  const done = await expectOk(
    await call(context, "/api/setup/complete", {
      data: { ...draft, enrollment: offer.enrollment, code: totp(offer.secret) },
    }),
    "setup complete",
  );
  await call(context, "/api/auth/logout");
  return saveState({ owner: OWNER, totpSecret: offer.secret, invite: done.inviteCode });
}

/**
 * Signs the context in as a test player, registering them on first use. The
 * account is remembered between runs, so repeated runs stay clear of the
 * registration rate limit.
 */
export async function signInPlayer(context, state, { name, instrument }) {
  const known = state.players?.[name];
  if (known) {
    await expectOk(await call(context, "/api/auth/login", { data: known }), `login ${name}`);
    return known;
  }
  const email = `${name.toLowerCase().replace(/\W+/g, ".")}@tonelink.test`;
  const password = "e2e-player-password-1";
  const account = { email, displayName: name, password, confirmPassword: password };
  await expectOk(
    await call(context, "/api/auth/register", { data: { ...account, inviteCode: state.invite } }),
    `register ${name}`,
  );
  await expectOk(
    await call(context, "/api/profile", {
      data: { displayName: name, instrument },
      method: "PATCH",
    }),
    `profile ${name}`,
  );
  state.players = { ...state.players, [name]: { email, password } };
  saveState(state);
  return state.players[name];
}

/** Signs the context in as the owner, waiting out a code that was just used. */
export async function signInOwner(context, state) {
  await expectOk(await call(context, "/api/auth/login", { data: state.owner }), "owner login");
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await call(context, "/api/auth/mfa", { data: { code: totp(state.totpSecret) } });
    if (result.status === 200) return;
    // A code is single use per 30 second step: wait for the next one.
    const untilNextStep = 30_000 - (Date.now() % 30_000) + 750;
    await new Promise((resolve) => setTimeout(resolve, untilNextStep));
  }
  throw new Error("owner mfa failed");
}

export async function createRoom(context, room) {
  return expectOk(await call(context, "/api/rooms", { data: room }), "create room");
}

/** Reads the engine's diagnostics snapshot from a room page. */
export function diagnostics(page) {
  return page.evaluate(() => window.__tonelink?.diagnostics() ?? null);
}
