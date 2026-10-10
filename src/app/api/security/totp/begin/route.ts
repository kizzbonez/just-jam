import { SENSITIVE_LIMIT } from "@/features/auth/server/rate-rules";
import { offerEnrollment } from "@/features/auth/server/totp-enrollment";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute({ limit: SENSITIVE_LIMIT }, ({ user }) =>
  offerEnrollment(user.email),
);
