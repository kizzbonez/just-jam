import { MAX_AVATAR_BYTES, removeAvatar, saveAvatar } from "@/features/profile/server/avatar";
import { badRequest } from "@/lib/http/errors";
import { userRoute } from "@/lib/http/route";

/** Raw image bytes in the request body. The type is detected from the bytes. */
export const PUT = userRoute({}, async ({ user, req }) => {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_AVATAR_BYTES) throw badRequest("The image must be 200 KB or smaller.");
  const data = new Uint8Array(await req.arrayBuffer());
  return { avatarVersion: await saveAvatar(user.id, data) };
});

export const DELETE = userRoute({}, ({ user }) => removeAvatar(user.id));
