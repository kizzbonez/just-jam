import { PasswordChangeSchema } from "@/features/auth/schemas";
import { changePassword } from "@/features/auth/server/account-security";
import { SENSITIVE_LIMIT } from "@/features/auth/server/rate-rules";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute(
  { body: PasswordChangeSchema, limit: SENSITIVE_LIMIT },
  ({ user, body }) => changePassword(user, body),
);
