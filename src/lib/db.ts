import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const holder = globalThis as unknown as { __tonelinkDb?: PrismaClient };

function client(): PrismaClient {
  holder.__tonelinkDb ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: env().DATABASE_URL }),
  });
  return holder.__tonelinkDb;
}

/**
 * Lazy handle: the pool is created on first query, not at import, so the build
 * can load route modules without a database.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const real = client();
    const value = Reflect.get(real, key);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
