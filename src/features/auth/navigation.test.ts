import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/features/auth/navigation";

describe("safeNextPath", () => {
  it("returns a local path unchanged", () => {
    expect(safeNextPath("?next=%2Froom%2Fabc123")).toBe("/room/abc123");
  });

  it("falls back to the lobby when nothing is requested", () => {
    expect(safeNextPath("")).toBe("/lobby");
  });

  it.each([
    "?next=https%3A%2F%2Fevil.example",
    "?next=%2F%2Fevil.example",
    "?next=%2F%5Cevil.example",
    "?next=javascript%3Aalert(1)",
  ])("refuses to leave the origin for %s", (search) => {
    expect(safeNextPath(search)).toBe("/lobby");
  });
});
