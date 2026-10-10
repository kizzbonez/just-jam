import "server-only";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/features/auth/server/current-user";
import { TICKET_TTL_SECONDS } from "@/features/rooms/constants";
import { grantRoomPass, hasRoomPass } from "@/features/rooms/server/room-pass";
import type { Room } from "@/generated/prisma/client";
import { signToken } from "@/lib/crypto/tokens";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, notFound, tooMany, unavailable } from "@/lib/http/errors";
import { allow, type RateRule } from "@/lib/http/rate-limit";
import { relayCert, type RelayCert } from "@/lib/relay-client";

const PIN_LIMIT: RateRule = { name: "room-pin", max: 8, windowMs: 5 * 60_000 };
const VISIT_DEDUPE_MS = 10 * 60_000;

export interface RoomTicket {
  ticket: string;
  relayUrl: string;
  /** Base64 SHA-256 to pin, or null when the relay has a CA-issued certificate. */
  certHash: string | null;
  isHost: boolean;
}

const pinError = (code: "pin_required" | "pin_invalid", message: string) =>
  new AppError({ status: 403, code, message, fields: { pin: message } });

async function assertPin(room: Room, user: SessionUser, pin: string | undefined): Promise<void> {
  if (!room.pinHash || room.hostId === user.id) return;
  const subject = { userId: user.id, roomId: room.id, slug: room.slug };
  if (await hasRoomPass(subject)) return;
  if (!pin) throw pinError("pin_required", "This room needs a PIN.");
  if (!allow(PIN_LIMIT, `${user.id}:${room.id}`)) throw tooMany();
  if (!(await bcrypt.compare(pin, room.pinHash))) {
    throw pinError("pin_invalid", "That PIN is not correct.");
  }
  await grantRoomPass(subject);
}

/** One history entry per sitting, not one per reconnect. */
async function recordVisit(roomId: string, userId: string): Promise<void> {
  const recent = await db.roomVisit.findFirst({
    where: { roomId, userId, joinedAt: { gt: new Date(Date.now() - VISIT_DEDUPE_MS) } },
    select: { id: true },
  });
  if (!recent) await db.roomVisit.create({ data: { roomId, userId } });
}

async function currentCert(): Promise<RelayCert> {
  try {
    return await relayCert();
  } catch {
    throw unavailable("The audio relay is not reachable right now. Try again in a moment.");
  }
}

/**
 * Admission check. The relay trusts the signed ticket completely, so every
 * rule about who may enter a room is enforced here before one is issued.
 */
export async function issueTicket(
  user: SessionUser,
  slug: string,
  pin: string | undefined,
): Promise<RoomTicket> {
  const room = await db.room.findUnique({ where: { slug } });
  if (!room || room.closedAt) throw notFound("This room does not exist or has been closed.");
  await assertPin(room, user, pin);
  const cert = await currentCert();
  const isHost = room.hostId === user.id;
  const claims = {
    sub: user.id,
    room: room.id,
    name: user.displayName,
    inst: user.instrument,
    host: isHost,
    max: room.maxPeers,
    ava: user.hasAvatar ? user.avatarVersion : 0,
  };
  const ticket = await signToken(claims, {
    secret: env().RELAY_SHARED_SECRET,
    audience: "tonelink:relay",
    ttlSeconds: TICKET_TTL_SECONDS,
  });
  await recordVisit(room.id, user.id);
  return {
    ticket,
    relayUrl: env().RELAY_PUBLIC_URL,
    certHash: cert.pinned ? cert.hash : null,
    isHost,
  };
}
