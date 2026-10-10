import { CreateRoomSchema } from "@/features/rooms/schemas";
import { createRoom } from "@/features/rooms/server/create-room";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute({ body: CreateRoomSchema }, ({ user, body }) =>
  createRoom(user, body),
);
