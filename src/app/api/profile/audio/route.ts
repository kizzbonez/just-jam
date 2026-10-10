import { AudioProfileSchema } from "@/features/profile/schemas";
import { saveAudioProfile } from "@/features/profile/server/profile";
import { userRoute } from "@/lib/http/route";

export const PUT = userRoute({ body: AudioProfileSchema }, ({ user, body }) =>
  saveAudioProfile(user.id, body),
);
