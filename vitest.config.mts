import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": at("./src"),
      // `server-only` throws outside a React Server environment by design.
      "server-only": at("./test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
