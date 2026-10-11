import { describe, expect, it } from "vitest";
import {
  OwnerAccountSchema,
  PasswordChangeSchema,
  RegisterSchema,
} from "@/features/auth/schemas";

const account = {
  email: "  Ana@Example.com ",
  displayName: "Ana Reyes",
  password: "a-long-enough-password",
  confirmPassword: "a-long-enough-password",
};

const firstIssue = (result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.error?.issues[0];

describe("RegisterSchema", () => {
  it("normalises the email and accepts matching passwords", () => {
    const parsed = RegisterSchema.parse(account);
    expect(parsed.email).toBe("ana@example.com");
  });

  it("reports a mismatch on the confirmation field", () => {
    const result = RegisterSchema.safeParse({ ...account, confirmPassword: "something-else-1" });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toMatchObject({
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  });

  it("requires the confirmation to be sent at all", () => {
    const withoutConfirm = { email: account.email, displayName: "Ana", password: account.password };
    expect(RegisterSchema.safeParse(withoutConfirm).success).toBe(false);
  });

  it("still enforces the password rules", () => {
    const short = { ...account, password: "short", confirmPassword: "short" };
    expect(firstIssue(RegisterSchema.safeParse(short))?.path).toEqual(["password"]);
    const huge = "x".repeat(80);
    expect(RegisterSchema.safeParse({ ...account, password: huge, confirmPassword: huge }).success).toBe(
      false,
    );
  });
});

describe("OwnerAccountSchema", () => {
  it("rejects a mismatched confirmation", () => {
    const result = OwnerAccountSchema.safeParse({ ...account, confirmPassword: "nope-nope-nope" });
    expect(firstIssue(result)?.path).toEqual(["confirmPassword"]);
  });
});

describe("PasswordChangeSchema", () => {
  const change = {
    currentPassword: "old-password-123",
    newPassword: "a-new-long-password",
    confirmPassword: "a-new-long-password",
  };

  it("accepts a confirmed new password", () => {
    expect(PasswordChangeSchema.safeParse(change).success).toBe(true);
  });

  it("rejects a mismatched confirmation", () => {
    const result = PasswordChangeSchema.safeParse({ ...change, confirmPassword: "a-new-long-passw0rd" });
    expect(firstIssue(result)?.path).toEqual(["confirmPassword"]);
  });
});
