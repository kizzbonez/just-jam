import { Lock } from "lucide-react";
import { RoomActions } from "@/features/rooms/components/room-actions";
import type { RoomSummary } from "@/features/rooms/server/list-rooms";
import { Badge } from "@/ui/primitives/badge";
import { Led } from "@/ui/primitives/led";

const pad = (value: number) => String(value).padStart(2, "0");

/** One room as a channel strip: lamp, name, tags, a player counter and its keys. */
export function RoomStrip({ room }: { room: RoomSummary }) {
  const live = room.live ?? 0;
  return (
    <li className="etch-b flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-3.5 last:border-0 last:shadow-none">
      <div className="flex min-w-0 items-center gap-3.5">
        <Led on={live > 0} pulse />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-display text-lg leading-none font-semibold tracking-wide text-ink uppercase">
              {room.name}
            </span>
            <Badge tone={room.visibility === "PUBLIC" ? "steel" : "wine"}>
              {room.visibility === "PUBLIC" ? "Public" : "Private"}
            </Badge>
            {room.hasPin && (
              <Badge tone="steel">
                <Lock aria-hidden className="size-3" /> PIN
              </Badge>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 text-sm text-label">
            <span className="readout text-xs">{room.slug}</span>
            <span>{room.isHost ? "You host this room" : `Hosted by ${room.hostName}`}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="well readout flex h-8 items-center gap-1 border border-etch px-2.5 text-sm"
          title="Players connected right now / capacity"
        >
          <span className={live > 0 ? "text-ink" : "text-steel-600"}>
            {room.live === null ? "--" : pad(live)}
          </span>
          <span className="text-steel-600">/</span>
          <span className="text-label">{pad(room.maxPeers)}</span>
          <span className="sr-only">players connected</span>
        </div>
        <RoomActions slug={room.slug} name={room.name} isHost={room.isHost} />
      </div>
    </li>
  );
}
