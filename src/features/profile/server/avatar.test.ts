import { describe, expect, it } from "vitest";
import { sniffImage } from "@/features/profile/server/avatar";

const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP by their leading bytes", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImage(webp)).toBe("image/webp");
  });

  it("refuses SVG, HTML and other content regardless of what it claims to be", () => {
    const text = (value: string) => new TextEncoder().encode(value);
    expect(sniffImage(text("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>"))).toBeNull();
    expect(sniffImage(text("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(sniffImage(text("GIF89a........"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});
