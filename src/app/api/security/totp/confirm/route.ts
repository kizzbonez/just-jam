import { TotpConfirmSchema } from "@/features/auth/schemas";
import { enableTotp } from "@/features/auth/server/account-security";
import { SENSITIVE_LIMIT } from "@/features/auth/server/rate-rules";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute(
  { body: TotpConfirmSchema, limit: SENSITIVE_LIMIT },
  async ({ user, body }) => ({ recoveryCodes: await enableTotp(user, body) }),
);
