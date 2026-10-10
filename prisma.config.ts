import { defineConfig } from "prisma/config";

// The Prisma CLI does not read .env files on its own. Existing variables win,
// so inside containers the injected DATABASE_URL is used as is.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // The file is optional.
  }
}

// `prisma generate` runs at build time with no database, so the URL is read
// loosely here. Commands that connect (migrate) fail on their own if it is unset.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
