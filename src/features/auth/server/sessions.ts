import "server-only";
import { SESSION_TTL_SECONDS } from "@/features/auth/constants";
import { clearSessionCookie, writeSessionCookie } from "@/features/auth/server/session-cookie";
import { signSessionToken } from "@/features/auth/server/session-token";
import { db } from "@/lib/db";
import type { RequestMeta } from "@/lib/http/route";

export interface SessionSummary {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  ip: string | null;
}

/** Creates the session row and sets the cookie that points at it. */
export async function startSession(userId: string, meta: RequestMeta): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const session = await db.session.create({
    data: { userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) ?? null },
  });
  await writeSessionCookie(await signSessionToken(userId, session.id), expiresAt);
}

export async function endSession(sessionId: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await clearSessionCookie();
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Used after a password change: every other device has to sign in again. */
export async function revokeOtherSessions(userId: string, keepId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null, id: { not: keepId } },
    data: { revokedAt: new Date() },
  });
}

export async function listSessions(userId: string, currentId: string): Promise<SessionSummary[]> {
  const rows = await db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    current: row.id === currentId,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    userAgent: row.userAgent,
    ip: row.ip,
  }));
}
