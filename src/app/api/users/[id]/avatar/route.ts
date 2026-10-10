import { loadAvatar } from "@/features/profile/server/avatar";
import { userRoute } from "@/lib/http/route";

/** Avatar bytes for any signed-in user. URLs carry a version, so they cache hard. */
export const GET = userRoute<undefined, { id: string }>({}, async ({ params }) => {
  const { data, mime } = await loadAvatar(params.id);
  return new Response(Buffer.from(data), {
    headers: {
      "content-type": mime,
      "cache-control": "private, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'",
      "x-content-type-options": "nosniff",
    },
  });
});
