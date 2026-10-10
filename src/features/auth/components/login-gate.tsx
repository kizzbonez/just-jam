import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSessionUser } from "@/features/auth/server/current-user";
import { isSetupComplete, registrationPolicy } from "@/features/auth/server/studio-settings";

/** Routes a visitor to setup or the lobby when the login form is not what they need. */
export async function LoginGate() {
  await connection();
  if (!(await isSetupComplete())) redirect("/setup");
  if (await getSessionUser()) redirect("/lobby");
  const policy = await registrationPolicy();
  return <LoginForm canRegister={policy.mode !== "CLOSED"} />;
}
