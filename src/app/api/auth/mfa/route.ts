import { MfaSchema } from "@/features/auth/schemas";
import { verifyMfa } from "@/features/auth/server/mfa";
import { LOGIN_LIMIT } from "@/features/auth/server/rate-rules";
import { publicRoute } from "@/lib/http/route";

export const POST = publicRoute({ body: MfaSchema, limit: LOGIN_LIMIT }, ({ body, meta }) =>
  verifyMfa(body.code, meta),
);
