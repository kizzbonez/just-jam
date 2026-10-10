import { SetupBeginSchema } from "@/features/auth/schemas";
import { SETUP_LIMIT } from "@/features/auth/server/rate-rules";
import { beginSetup } from "@/features/auth/server/setup";
import { publicRoute } from "@/lib/http/route";

export const POST = publicRoute({ body: SetupBeginSchema, limit: SETUP_LIMIT }, ({ body }) =>
  beginSetup(body),
);
