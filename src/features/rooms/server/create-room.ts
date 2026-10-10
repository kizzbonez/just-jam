import "server-only";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/features/auth/server/current-user";
import { MAX_OPEN_ROOMS } from "@/features/rooms/constants";
import type { CreateRoomInput } from "@/features/rooms/schemas";
import { newRoomSlug } from "@/features/rooms/server/slug";
import { db } from "@/lib/db";
import { conflict } from "@/lib/http/errors";

const PIN_COST = 10;

export async function createRoom(user: SessionUser, input: CreateRoomInput) {
  const open = await db.room.count({ where: { hostId: user.id, closedAt: null } });
  if (open >= MAX_OPEN_ROOMS) {
    throw conflict(`You already have ${MAX_OPEN_ROOMS} open rooms. Close one first.`);
  }
  const room = await db.room.create({
    data: {
      slug: newRoomSlug(),
      name: input.name,
      visibility: input.visibility,
      maxPeers: input.maxPeers,
      pinHash: input.pin ? await bcrypt.hash(input.pin, PIN_COST) : null,
      hostId: user.id,
    },
  });
  return { slug: room.slug };
}
