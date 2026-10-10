// Creates .env with fresh random secrets. Never overwrites an existing file.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TARGET = ".env";
const secret = (bytes) => randomBytes(bytes).toString("base64url");

if (existsSync(TARGET)) {
  console.log(`${TARGET} already exists. Leaving it untouched.`);
  process.exit(0);
}

const dbPassword = secret(24);
const filled = readFileSync(".env.example", "utf8")
  .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${dbPassword}`)
  .replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret(48)}`)
  .replace(/^RELAY_SHARED_SECRET=.*$/m, `RELAY_SHARED_SECRET=${secret(48)}`);

writeFileSync(TARGET, filled, { mode: 0o600 });

// Host-side settings for `npm run dev` with the compose.dev.yaml overlay.
const local = [
  "# Used only by `npm run dev` on the host (see compose.dev.yaml).",
  `DATABASE_URL=postgresql://tonelink:${dbPassword}@127.0.0.1:54329/tonelink`,
  "RELAY_ADMIN_URL=http://127.0.0.1:8081",
  "",
].join("\n");
writeFileSync(".env.local", local, { mode: 0o600 });

console.log(`Wrote ${TARGET} and .env.local with generated secrets.`);
console.log("Next: docker compose up -d --build");
