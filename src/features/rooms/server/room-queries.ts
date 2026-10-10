import "server-only";
import type { SessionUser } from "@/features/auth/server/current-user";
import { db } from "@/lib/db";
import { forbidden, notFound } from "@/lib/http/errors";
import { relayCloseRoom } from "@/lib/relay-client";

export interface RoomDoor {
  slug: string;
  name: string;
  hostName: string;
  isHost: boolean;
  needsPin: boolean;
  maxPeers: number;
}

/** What the pre-join screen needs. Null when the room is missing or closed. */
export async function findRoomDoor(user: SessionUser, slug: string): Promise<RoomDoor | null> {
  const room = await db.room.findUnique({
    where: { slug },
    include: { host: { select: { displayName: true } } },
  });
  if (!room || room.closedAt) return null;
  const isHost = room.hostId === user.id;
  return {
    slug: room.slug,
    name: room.name,
    hostName: room.host.displayName,
    isHost,
    needsPin: room.pinHash !== null && !isHost,
    maxPeers: room.maxPeers,
  };
}

/** Closes a room for good and disconnects everyone in it. Host or owner only. */
export async function closeRoom(user: SessionUser, slug: string): Promise<void> {
  const room = await db.room.findUnique({ where: { slug } });
  if (!room || room.closedAt) throw notFound("This room does not exist or is already closed.");
  if (room.hostId !== user.id && user.role !== "ADMIN") throw forbidden();
  await db.room.update({ where: { id: room.id }, data: { closedAt: new Date() } });
  await relayCloseRoom(room.id);
}

export interface VisitEntry {
  id: string;
  roomName: string;
  slug: string;
  hostName: string;
  open: boolean;
  joinedAt: string;
}

export async function listVisits(userId: string, take = 60): Promise<VisitEntry[]> {
  const visits = await db.roomVisit.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    take,
    include: { room: { include: { host: { select: { displayName: true } } } } },
  });
  return visits.map((visit) => ({
    id: visit.id,
    roomName: visit.room.name,
    slug: visit.room.slug,
    hostName: visit.room.host.displayName,
    open: visit.room.closedAt === null,
    joinedAt: visit.joinedAt.toISOString(),
  }));
}
