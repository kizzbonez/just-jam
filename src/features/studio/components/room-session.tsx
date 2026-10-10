"use client";

import { useState } from "react";
import type { RoomTicket } from "@/features/rooms/server/issue-ticket";
import type { RoomDoor } from "@/features/rooms/server/room-queries";
import type { AudioProfile } from "@/features/studio/audio-profile";
import { RoomGate } from "@/features/studio/components/room-gate";
import { Notice } from "@/ui/primitives/notice";

export interface SelfInfo {
  userId: string;
  name: string;
  instrument: string;
  avatar: string | null;
}

export interface RoomSessionProps {
  door: RoomDoor;
  self: SelfInfo;
  profile: AudioProfile;
}

/** Holds the admission ticket: the gate before it exists, the console after. */
export function RoomSession({ door }: RoomSessionProps) {
  const [ticket, setTicket] = useState<RoomTicket | null>(null);
  if (!ticket) return <RoomGate door={door} onEnter={setTicket} />;
  return <Notice tone="success">Admitted to {door.name}. The console lands in the next release.</Notice>;
}
