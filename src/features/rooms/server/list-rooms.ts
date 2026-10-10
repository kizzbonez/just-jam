import "server-only";
import type { SessionUser } from "@/features/auth/server/current-user";
import type { RoomVisibilityValue } from "@/features/rooms/constants";
import { db } from "@/lib/db";
import { relayCounts } from "@/lib/relay-client";

export interface RoomSummary {
  slug: string;
  name: string;
  visibility: RoomVisibilityValue;
  hasPin: boolean;
  hostName: string;
  isHost: boolean;
  maxPeers: number;
  /** Players connected right now, or null when the relay is unreachable. */
  live: number | null;
  createdAt: string;
}

export interface Lobby {
  mine: RoomSummary[];
  open: RoomSummary[];
  relayOnline: boolean;
}

const PUBLIC_LIMIT = 50;

/** The viewer's own open rooms, plus public rooms hosted by others. */
export async function loadLobby(user: SessionUser): Promise<Lobby> {
  const [rooms, counts] = await Promise.all([
    db.room.findMany({
      where: { closedAt: null, OR: [{ hostId: user.id }, { visibility: "PUBLIC" }] },
      include: { host: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: PUBLIC_LIMIT + 20,
    }),
    relayCounts(),
  ]);
  const summaries = rooms.map((room) => ({
    slug: room.slug,
    name: room.name,
    visibility: room.visibility,
    hasPin: room.pinHash !== null,
    hostName: room.host.displayName,
    isHost: room.hostId === user.id,
    maxPeers: room.maxPeers,
    live: counts ? (counts[room.id] ?? 0) : null,
    createdAt: room.createdAt.toISOString(),
  }));
  return {
    mine: summaries.filter((room) => room.isHost),
    open: summaries.filter((room) => !room.isHost).slice(0, PUBLIC_LIMIT),
    relayOnline: counts !== null,
  };
}
