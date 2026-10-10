import { AdminSettingsSchema } from "@/features/admin/schemas";
import { updateRegistration } from "@/features/admin/server/settings";
import { adminRoute } from "@/lib/http/route";

export const PUT = adminRoute({ body: AdminSettingsSchema }, ({ body }) =>
  updateRegistration(body),
);
