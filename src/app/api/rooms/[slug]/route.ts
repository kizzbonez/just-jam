import { closeRoom } from "@/features/rooms/server/room-queries";
import { userRoute } from "@/lib/http/route";

export const DELETE = userRoute<undefined, { slug: string }>({}, ({ user, params }) =>
  closeRoom(user, params.slug),
);
