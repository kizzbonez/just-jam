import { existsSync, readFileSync } from "node:fs";

/** Parses KEY=value lines from an env file. Missing files read as empty. */
export function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const entries = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]);
  return Object.fromEntries(entries);
}

const file = readEnvFile(".env");

export const BASE_URL = process.env.E2E_BASE_URL ?? file.APP_URL ?? "http://127.0.0.1:3410";
export const SETUP_TOKEN = process.env.SETUP_TOKEN ?? file.SETUP_TOKEN ?? "";
