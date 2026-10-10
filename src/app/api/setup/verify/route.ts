import { SetupTokenSchema } from "@/features/auth/schemas";
import { SETUP_LIMIT } from "@/features/auth/server/rate-rules";
import { assertSetupToken } from "@/features/auth/server/setup";
import { publicRoute } from "@/lib/http/route";

export const POST = publicRoute({ body: SetupTokenSchema, limit: SETUP_LIMIT }, ({ body }) =>
  assertSetupToken(body.token),
);
