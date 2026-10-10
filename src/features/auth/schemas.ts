import { z } from "zod";
import { REGISTRATION_MODES } from "@/features/auth/constants";

const BCRYPT_MAX_BYTES = 72;

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address."));

export const PasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .refine((value) => new TextEncoder().encode(value).length <= BCRYPT_MAX_BYTES, {
    message: "Use at most 72 bytes.",
  });

export const DisplayNameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(40, "Use at most 40 characters.");

export const TotpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});

/** Second login step: a 6-digit TOTP code or a one-time recovery code. */
export const MfaSchema = z.object({
  code: z.string().trim().min(6, "Enter a code.").max(24),
});

export const RegisterSchema = z.object({
  email: EmailSchema,
  displayName: DisplayNameSchema,
  password: PasswordSchema,
  inviteCode: z.string().trim().max(64).optional(),
});

export const SetupBeginSchema = z.object({
  token: z.string().trim().min(8, "Paste the setup token.").max(128),
  email: EmailSchema,
  displayName: DisplayNameSchema,
  password: PasswordSchema,
  registrationMode: z.enum(REGISTRATION_MODES),
});

export const SetupCompleteSchema = SetupBeginSchema.extend({
  enrollment: z.string().min(16).max(2000),
  code: TotpCodeSchema,
});

export const SetupTokenSchema = z.object({
  token: z.string().trim().min(8, "Paste the setup token.").max(128),
});

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: PasswordSchema,
});

export const TotpConfirmSchema = z.object({
  enrollment: z.string().min(16).max(2000),
  code: TotpCodeSchema,
});

export const PasswordConfirmSchema = z.object({
  password: z.string().min(1, "Enter your password.").max(200),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type SetupBeginInput = z.infer<typeof SetupBeginSchema>;
export type SetupCompleteInput = z.infer<typeof SetupCompleteSchema>;
export type PasswordChangeInput = z.infer<typeof PasswordChangeSchema>;
