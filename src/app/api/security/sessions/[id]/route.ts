import { revokeSession } from "@/features/auth/server/sessions";
import { userRoute } from "@/lib/http/route";

export const DELETE = userRoute<undefined, { id: string }>({}, ({ user, params }) =>
  revokeSession(user.id, params.id),
);
