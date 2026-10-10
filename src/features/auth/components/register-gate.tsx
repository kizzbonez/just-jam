import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getSessionUser } from "@/features/auth/server/current-user";
import { isSetupComplete, registrationPolicy } from "@/features/auth/server/studio-settings";
import { Notice } from "@/ui/primitives/notice";

export async function RegisterGate() {
  await connection();
  if (!(await isSetupComplete())) redirect("/setup");
  if (await getSessionUser()) redirect("/lobby");
  const policy = await registrationPolicy();
  if (policy.mode === "CLOSED") {
    return (
      <Notice>
        Registration is closed on this studio. Ask the owner for an account, or{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          sign in
        </Link>
        .
      </Notice>
    );
  }
  return <RegisterForm inviteOnly={policy.mode === "INVITE"} />;
}
