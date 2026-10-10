import type { RateRule } from "@/lib/http/rate-limit";

const MINUTE = 60_000;

export const LOGIN_LIMIT: RateRule = { name: "login", max: 10, windowMs: MINUTE };
export const REGISTER_LIMIT: RateRule = { name: "register", max: 5, windowMs: 10 * MINUTE };
export const SETUP_LIMIT: RateRule = { name: "setup", max: 10, windowMs: 10 * MINUTE };
export const SENSITIVE_LIMIT: RateRule = { name: "sensitive", max: 10, windowMs: MINUTE };
