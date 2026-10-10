import { PasswordConfirmSchema } from "@/features/auth/schemas";
import { regenerateRecoveryCodes } from "@/features/auth/server/account-security";
import { SENSITIVE_LIMIT } from "@/features/auth/server/rate-rules";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute(
  { body: PasswordConfirmSchema, limit: SENSITIVE_LIMIT },
  async ({ user, body }) => ({
    recoveryCodes: await regenerateRecoveryCodes(user, body.password),
  }),
);
