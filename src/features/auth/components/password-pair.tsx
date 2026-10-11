import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";

export interface PasswordPairProps {
  /** Form field name of the first input. The second is always `confirmPassword`. */
  name?: "password" | "newPassword";
  label?: string;
  errors: Record<string, string | undefined>;
}

/** A new password typed twice, so a typo cannot lock someone out. */
export function PasswordPair({ name = "password", label = "Password", errors }: PasswordPairProps) {
  return (
    <>
      <Field label={label} htmlFor={name} hint="At least 10 characters." error={errors[name]}>
        <Input id={name} name={name} type="password" autoComplete="new-password" required />
      </Field>
      <Field
        label={`Confirm ${label.toLowerCase()}`}
        htmlFor="confirmPassword"
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
    </>
  );
}
