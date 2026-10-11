import { describe, expect, it } from "vitest";
import { accessFor } from "@/lib/http/route-access";

describe("accessFor", () => {
  it("opens the home page, the sign-in screens and the landing pictures", () => {
    for (const path of ["/", "/login", "/register", "/setup", "/landing/console.png"]) {
      expect(accessFor(path)).toBe("public");
    }
    expect(accessFor("/.well-known/security.txt")).toBe("public");
  });

  it("opens only the API routes a visitor needs before signing in", () => {
    expect(accessFor("/api/auth/login")).toBe("public");
    expect(accessFor("/api/setup/verify")).toBe("public");
    expect(accessFor("/api/health")).toBe("public");
    expect(accessFor("/api/auth/logout")).toBe("api");
    expect(accessFor("/api/rooms")).toBe("api");
    expect(accessFor("/api/admin/settings")).toBe("api");
  });

  it("treats studio sections and everything beneath them as pages", () => {
    for (const path of ["/lobby", "/room/kqx-7m2d-pfa", "/docs", "/docs/latency", "/admin"]) {
      expect(accessFor(path)).toBe("page");
    }
  });

  it("does not mistake a look-alike prefix for a studio section", () => {
    expect(accessFor("/lobbyist")).toBe("asset");
    expect(accessFor("/documents")).toBe("asset");
  });

  it("hides protected files and unknown paths behind a 404", () => {
    for (const path of ["/guide/console.png", "/engine/transport.worker.js", "/backup.sql"]) {
      expect(accessFor(path)).toBe("asset");
    }
    expect(accessFor("/_next/image")).toBe("asset");
  });

  it("never serves dotfiles, wherever they are", () => {
    for (const path of ["/.env", "/.git/config", "/.aws/credentials", "/docs/.htaccess"]) {
      expect(accessFor(path)).toBe("blocked");
    }
    expect(accessFor("/.well-known/other")).toBe("asset");
  });
});
