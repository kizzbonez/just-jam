import { randomInt } from "node:crypto";

// Skips look-alike characters: i, l, o, 0 and 1.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function chunk(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** A shareable room id such as `kqx-7m2d-pfa`: about 49 bits, easy to read aloud. */
export function newRoomSlug(): string {
  return `${chunk(3)}-${chunk(4)}-${chunk(3)}`;
}
