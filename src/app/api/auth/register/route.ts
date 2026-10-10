import { RegisterSchema } from "@/features/auth/schemas";
import { REGISTER_LIMIT } from "@/features/auth/server/rate-rules";
import { register } from "@/features/auth/server/register";
import { publicRoute } from "@/lib/http/route";

export const POST = publicRoute(
  { body: RegisterSchema, limit: REGISTER_LIMIT },
  ({ body, meta }) => register(body, meta),
);
