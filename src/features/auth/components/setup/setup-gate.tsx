import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SetupWizard } from "@/features/auth/components/setup/setup-wizard";
import { isSetupComplete } from "@/features/auth/server/studio-settings";

/** The wizard exists only until the owner account is created. */
export async function SetupGate() {
  await connection();
  if (await isSetupComplete()) redirect("/login");
  return <SetupWizard />;
}
