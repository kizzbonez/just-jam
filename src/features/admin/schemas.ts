import { z } from "zod";
import { REGISTRATION_MODES } from "@/features/auth/constants";

export const AdminSettingsSchema = z.object({
  registrationMode: z.enum(REGISTRATION_MODES),
  /** Replace the invite code. The previous one stops working immediately. */
  rotateInvite: z.boolean().default(false),
});

export type AdminSettingsInput = z.infer<typeof AdminSettingsSchema>;
