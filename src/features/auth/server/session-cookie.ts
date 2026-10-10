import "server-only";
import { cookies } from "next/headers";
import { MFA_COOKIE, MFA_TTL_SECONDS, SESSION_COOKIE } from "@/features/auth/constants";
import { isSecureOrigin } from "@/lib/env";

const base = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isSecureOrigin(),
  path: "/",
});

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function writeSessionCookie(token: string, expires: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, { ...base(), expires });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readMfaCookie(): Promise<string | undefined> {
  return (await cookies()).get(MFA_COOKIE)?.value;
}

export async function writeMfaCookie(token: string): Promise<void> {
  (await cookies()).set(MFA_COOKIE, token, { ...base(), maxAge: MFA_TTL_SECONDS });
}

export async function clearMfaCookie(): Promise<void> {
  (await cookies()).delete(MFA_COOKIE);
}
