export const SESSION_COOKIE = "tl_session";
export const MFA_COOKIE = "tl_mfa";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
export const MFA_TTL_SECONDS = 60 * 5;

export const REGISTRATION_MODES = ["OPEN", "INVITE", "CLOSED"] as const;
export type RegistrationModeValue = (typeof REGISTRATION_MODES)[number];

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;
export const RECOVERY_CODE_COUNT = 8;
