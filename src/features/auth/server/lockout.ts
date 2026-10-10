import "server-only";
import { LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from "@/features/auth/constants";
import { db } from "@/lib/db";
import { tooMany } from "@/lib/http/errors";

interface LockState {
  id: string;
  failedLogins: number;
  lockedUntil: Date | null;
}

export function assertNotLocked(user: LockState): void {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw tooMany("Too many failed attempts. This account is locked for a few minutes.");
  }
}

/** Counts a failed password or second-factor attempt and locks at the limit. */
export async function recordFailure(user: LockState): Promise<void> {
  const failedLogins = user.failedLogins + 1;
  const locked = failedLogins >= MAX_FAILED_LOGINS;
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLogins: locked ? 0 : failedLogins,
      lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
    },
  });
}

export async function clearFailures(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: null } });
}
