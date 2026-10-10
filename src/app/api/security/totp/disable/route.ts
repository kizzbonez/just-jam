import { PasswordConfirmSchema } from "@/features/auth/schemas";
import { disableTotp } from "@/features/auth/server/account-security";
import { SENSITIVE_LIMIT } from "@/features/auth/server/rate-rules";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute(
  { body: PasswordConfirmSchema, limit: SENSITIVE_LIMIT },
  ({ user, body }) => disableTotp(user, body.password),
);
