import { describe, expect, it } from "vitest";
import { CreateRoomSchema, parseRoomRef } from "@/features/rooms/schemas";
import { newRoomSlug } from "@/features/rooms/server/slug";

describe("parseRoomRef", () => {
  it("accepts a bare room id", () => {
    expect(parseRoomRef("kqx-7m2d-pfa")).toBe("kqx-7m2d-pfa");
    expect(parseRoomRef("  KQX-7M2D-PFA ")).toBe("kqx-7m2d-pfa");
  });

  it("extracts the id from a pasted link", () => {
    expect(parseRoomRef("http://127.0.0.1:3410/room/kqx-7m2d-pfa")).toBe("kqx-7m2d-pfa");
    expect(parseRoomRef("https://jam.example.com/room/kqx-7m2d-pfa?from=chat#top")).toBe(
      "kqx-7m2d-pfa",
    );
  });

  it("rejects anything else", () => {
    expect(parseRoomRef("")).toBeNull();
    expect(parseRoomRef("hello")).toBeNull();
    expect(parseRoomRef("https://jam.example.com/lobby")).toBeNull();
    expect(parseRoomRef("kqx-7m2d-pf1")).toBeNull();
  });

  it("accepts every generated id", () => {
    for (let i = 0; i < 200; i++) {
      const slug = newRoomSlug();
      expect(parseRoomRef(slug)).toBe(slug);
    }
  });
});

describe("CreateRoomSchema", () => {
  const base = { name: "Thursday rehearsal", visibility: "PRIVATE", maxPeers: "6" };

  it("treats an empty PIN as no PIN and coerces the size", () => {
    const room = CreateRoomSchema.parse({ ...base, pin: "" });
    expect(room.pin).toBeUndefined();
    expect(room.maxPeers).toBe(6);
  });

  it("rejects a malformed PIN and an oversized room", () => {
    expect(CreateRoomSchema.safeParse({ ...base, pin: "12" }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ ...base, pin: "12 34" }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ ...base, maxPeers: "40" }).success).toBe(false);
  });
});
