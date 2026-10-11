"use client";

import { useState } from "react";
import type { RoomTicket } from "@/features/rooms/server/issue-ticket";
import type { RoomDoor } from "@/features/rooms/server/room-queries";
import type { AudioProfile } from "@/features/studio/audio-profile";
import { RoomGate } from "@/features/studio/components/room-gate";
import { StudioConsole } from "@/features/studio/components/studio-console";

export interface RoomSessionProps {
  door: RoomDoor;
  profile: AudioProfile;
}

/** Holds the admission ticket: the entry screen before it exists, the console after. */
export function RoomSession({ door, profile }: RoomSessionProps) {
  const [ticket, setTicket] = useState<RoomTicket | null>(null);
  if (!ticket) return <RoomGate door={door} onEnter={setTicket} />;
  return (
    <StudioConsole
      door={door}
      ticket={ticket}
      profile={profile}
      onRejoin={() => setTicket(null)}
    />
  );
}
