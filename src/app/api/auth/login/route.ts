import { LoginSchema } from "@/features/auth/schemas";
import { login } from "@/features/auth/server/login";
import { LOGIN_LIMIT } from "@/features/auth/server/rate-rules";
import { publicRoute } from "@/lib/http/route";

export const POST = publicRoute({ body: LoginSchema, limit: LOGIN_LIMIT }, ({ body, meta }) =>
  login(body, meta),
);
