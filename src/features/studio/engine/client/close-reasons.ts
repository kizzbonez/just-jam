import { RELAY_CLOSE } from "@/features/rooms/constants";

const REASONS: Record<number, string> = {
  [RELAY_CLOSE.ROOM_FULL]: "This room is full.",
  [RELAY_CLOSE.BANNED]: "The host removed you from this room.",
  [RELAY_CLOSE.KICKED]: "The host removed you from this room.",
  [RELAY_CLOSE.REPLACED]: "You joined this room from another tab or device.",
  [RELAY_CLOSE.ROOM_GONE]: "The host closed this room.",
};

/** Turns a relay close code into a sentence for the player. */
export function describeClose(code: number | null, fallback: string): string {
  if (code !== null && REASONS[code]) return REASONS[code];
  if (code === 0) return "You left the room.";
  return fallback || "The connection to the audio relay was lost.";
}

/** Codes after which entering again would only fail the same way. */
export function canRejoin(code: number | null): boolean {
  return code !== RELAY_CLOSE.BANNED && code !== RELAY_CLOSE.KICKED && code !== RELAY_CLOSE.ROOM_GONE;
}
