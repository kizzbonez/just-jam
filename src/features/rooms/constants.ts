export const ROOM_VISIBILITIES = ["PRIVATE", "PUBLIC"] as const;
export type RoomVisibilityValue = (typeof ROOM_VISIBILITIES)[number];

export const MIN_PEERS = 2;
export const MAX_PEERS = 8;
export const DEFAULT_PEERS = 6;

/** A host may keep this many rooms open at once. */
export const MAX_OPEN_ROOMS = 10;

export const TICKET_TTL_SECONDS = 60;
export const ROOM_PASS_TTL_SECONDS = 60 * 60 * 12;

/** Close codes the relay ends a session with (relay/wire.go). */
export const RELAY_CLOSE = {
  ROOM_FULL: 4001,
  BANNED: 4002,
  KICKED: 4003,
  REPLACED: 4004,
  ROOM_GONE: 4005,
} as const;
