import { requireUser } from "@/features/auth/server/current-user";
import { loadAudioProfile } from "@/features/profile/server/profile";
import { findRoomDoor } from "@/features/rooms/server/room-queries";
import { RoomMissing } from "@/features/studio/components/room-missing";
import { RoomSession } from "@/features/studio/components/room-session";
import { avatarUrl } from "@/ui/primitives/avatar";

/** Server side of the room page: who is asking, which room, their saved audio settings. */
export async function RoomEntry({ params }: { params: Promise<{ slug: string }> }) {
  const [user, { slug }] = await Promise.all([requireUser(), params]);
  const door = await findRoomDoor(user, slug);
  if (!door) return <RoomMissing />;
  const profile = await loadAudioProfile(user.id);
  const self = {
    userId: user.id,
    name: user.displayName,
    instrument: user.instrument,
    avatar: avatarUrl(user),
  };
  return <RoomSession door={door} self={self} profile={profile} />;
}
