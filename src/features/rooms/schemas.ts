import { z } from "zod";
import { MAX_PEERS, MIN_PEERS, ROOM_VISIBILITIES } from "@/features/rooms/constants";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const RoomPinSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4,12}$/, "Use 4 to 12 letters or digits.");

export const CreateRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(48, "Use at most 48 characters."),
  visibility: z.enum(ROOM_VISIBILITIES),
  /** Optional. When set, everyone except the host must enter it. */
  pin: z.preprocess(blankToUndefined, RoomPinSchema.optional()),
  maxPeers: z.coerce.number().int().min(MIN_PEERS).max(MAX_PEERS),
});

export const TicketRequestSchema = z.object({
  pin: z.preprocess(blankToUndefined, z.string().trim().max(32).optional()),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

const SLUG_PATTERN = /^[a-z2-9]{3}-[a-z2-9]{4}-[a-z2-9]{3}$/;

/**
 * Accepts a room id or a pasted room link and returns the id, or null when it
 * is neither.
 */
export function parseRoomRef(input: string): string | null {
  const text = input.trim().toLowerCase();
  const candidate = text.includes("/") ? (text.split("/room/")[1] ?? "") : text;
  const slug = candidate.split(/[?#/]/)[0];
  return SLUG_PATTERN.test(slug) ? slug : null;
}
