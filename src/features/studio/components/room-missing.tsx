import Link from "next/link";
import { RackUnit } from "@/ui/rack/rack-unit";

export function RoomMissing() {
  return (
    <RackUnit label="Room" code="TL-404" className="mx-auto max-w-xl" bodyClassName="p-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-[0.06em] text-ink uppercase">
          Room not found
        </h1>
        <p className="text-sm text-ink-soft">
          This room does not exist or its host has closed it. Check the link, or open a new room
          from the lobby.
        </p>
        <Link href="/lobby" className="silk self-start text-ink underline-offset-4 hover:underline">
          Back to the lobby
        </Link>
      </div>
    </RackUnit>
  );
}
