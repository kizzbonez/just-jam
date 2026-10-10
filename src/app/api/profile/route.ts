import { ProfileSchema } from "@/features/profile/schemas";
import { updateProfile } from "@/features/profile/server/profile";
import { userRoute } from "@/lib/http/route";

export const PATCH = userRoute({ body: ProfileSchema }, ({ user, body }) =>
  updateProfile(user.id, body),
);
