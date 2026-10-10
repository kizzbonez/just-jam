import "server-only";
import { cookies } from "next/headers";
import { ROOM_PASS_TTL_SECONDS } from "@/features/rooms/constants";
import { signToken, verifyToken } from "@/lib/crypto/tokens";
import { env, isSecureOrigin } from "@/lib/env";

const AUDIENCE = "tonelink:room-pass";
const cookieName = (slug: string) => `tl_room_${slug}`;

interface PassSubject {
  userId: string;
  roomId: string;
  slug: string;
}

/**
 * Remembers that this user already proved they know the room PIN, so a page
 * reload does not ask again. The cookie is scoped to that room's API path.
 */
export async function grantRoomPass(subject: PassSubject): Promise<void> {
  const token = await signToken(
    { sub: subject.userId, room: subject.roomId },
    { secret: env().AUTH_SECRET, audience: AUDIENCE, ttlSeconds: ROOM_PASS_TTL_SECONDS },
  );
  (await cookies()).set(cookieName(subject.slug), token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecureOrigin(),
    path: `/api/rooms/${subject.slug}`,
    maxAge: ROOM_PASS_TTL_SECONDS,
  });
}

export async function hasRoomPass(subject: PassSubject): Promise<boolean> {
  const token = (await cookies()).get(cookieName(subject.slug))?.value;
  if (!token) return false;
  const claims = await verifyToken(token, { secret: env().AUTH_SECRET, audience: AUDIENCE });
  return claims?.sub === subject.userId && claims.room === subject.roomId;
}
