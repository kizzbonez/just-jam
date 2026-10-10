import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readSessionCookie } from "@/features/auth/server/session-cookie";
import { readSessionToken } from "@/features/auth/server/session-token";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/http/errors";

export interface SessionUser {
  id: string;
  sessionId: string;
  email: string;
  displayName: string;
  instrument: string;
  role: "ADMIN" | "MEMBER";
  avatarVersion: number;
  hasAvatar: boolean;
  totpEnabled: boolean;
}

const TOUCH_AFTER_MS = 10 * 60 * 1000;

function toSessionUser(user: User, sessionId: string): SessionUser {
  return {
    id: user.id,
    sessionId,
    email: user.email,
    displayName: user.displayName,
    instrument: user.instrument,
    role: user.role,
    avatarVersion: user.avatarVersion,
    hasAvatar: user.avatarMime !== null,
    totpEnabled: user.totpEnabledAt !== null,
  };
}

function touch(sessionId: string, lastSeenAt: Date): void {
  if (Date.now() - lastSeenAt.getTime() < TOUCH_AFTER_MS) return;
  void db.session
    .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);
}

/**
 * The signed cookie only names a session row. The row decides whether the
 * session is still good, which is what makes sign-out and revocation immediate.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionCookie();
  const claims = token ? await readSessionToken(token) : null;
  if (!claims) return null;
  const session = await db.session.findUnique({
    where: { id: claims.sid },
    include: { user: { omit: { avatar: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  if (session.user.disabledAt) return null;
  touch(session.id, session.lastSeenAt);
  return toSessionUser(session.user as User, session.id);
});

/** For pages: sends the visitor to the login screen when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For admin pages. Owners must keep two-factor on to reach them. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/lobby");
  if (!user.totpEnabled) redirect("/security?enroll=required");
  return user;
}

/** For route handlers: throws instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireApiAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") throw forbidden();
  if (!user.totpEnabled) throw forbidden("Turn on two-factor authentication first.");
  return user;
}
