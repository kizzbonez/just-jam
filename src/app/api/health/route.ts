import { connection } from "next/server";
import { db } from "@/lib/db";

/** Liveness and database reachability, for the container health check. */
export async function GET(): Promise<Response> {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
