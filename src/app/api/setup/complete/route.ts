import { SetupCompleteSchema } from "@/features/auth/schemas";
import { SETUP_LIMIT } from "@/features/auth/server/rate-rules";
import { completeSetup } from "@/features/auth/server/setup";
import { publicRoute } from "@/lib/http/route";

export const POST = publicRoute(
  { body: SetupCompleteSchema, limit: SETUP_LIMIT },
  ({ body, meta }) => completeSetup(body, meta),
);
