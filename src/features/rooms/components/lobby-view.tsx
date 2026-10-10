import type { ReactNode } from "react";
import { requireUser } from "@/features/auth/server/current-user";
import { LobbyRefresh } from "@/features/rooms/components/lobby-refresh";
import { RoomStrip } from "@/features/rooms/components/room-strip";
import { loadLobby, type RoomSummary } from "@/features/rooms/server/list-rooms";
import { Led } from "@/ui/primitives/led";
import { Notice } from "@/ui/primitives/notice";
import { RackUnit } from "@/ui/rack/rack-unit";

function RoomList({ rooms, empty }: { rooms: RoomSummary[]; empty: ReactNode }) {
  if (rooms.length === 0) return <p className="py-4 text-sm text-label">{empty}</p>;
  return (
    <ul className="flex flex-col">
      {rooms.map((room) => (
        <RoomStrip key={room.slug} room={room} />
      ))}
    </ul>
  );
}

function RelayLamp({ online }: { online: boolean }) {
  return (
    <span className="silk flex items-center gap-2">
      <Led on={online} /> Relay {online ? "online" : "offline"}
    </span>
  );
}

export async function LobbyView() {
  const user = await requireUser();
  const lobby = await loadLobby(user);
  return (
    <div className="flex flex-col gap-5">
      <LobbyRefresh />
      {!lobby.relayOnline && (
        <Notice tone="error">
          The audio relay is not answering, so rooms cannot be entered right now. Player counts
          are hidden until it is back.
        </Notice>
      )}
      <RackUnit
        label="Your rooms"
        code="TL-RM-A"
        aside={<RelayLamp online={lobby.relayOnline} />}
        bodyClassName="py-1"
      >
        <RoomList
          rooms={lobby.mine}
          empty="You have no open rooms. Create one and send the link to your band."
        />
      </RackUnit>
      <RackUnit label="Open rooms" code="TL-RM-B" bodyClassName="py-1">
        <RoomList
          rooms={lobby.open}
          empty="No public rooms are open. Private rooms are reached by their link."
        />
      </RackUnit>
    </div>
  );
}
