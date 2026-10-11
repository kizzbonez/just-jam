import { requireUser } from "@/features/auth/server/current-user";
import { loadAudioProfile } from "@/features/profile/server/profile";
import { findRoomDoor } from "@/features/rooms/server/room-queries";
import { RoomMissing } from "@/features/studio/components/room-missing";
import { RoomSession } from "@/features/studio/components/room-session";

/** Server side of the room page: who is asking, which room, their saved audio settings. */
export async function RoomEntry({ params }: { params: Promise<{ slug: string }> }) {
  const [user, { slug }] = await Promise.all([requireUser(), params]);
  const door = await findRoomDoor(user, slug);
  if (!door) return <RoomMissing />;
  return <RoomSession door={door} profile={await loadAudioProfile(user.id)} />;
}
