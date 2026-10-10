import { requireUser } from "@/features/auth/server/current-user";
import { UserMenu } from "@/features/shell/components/user-menu";
import { avatarUrl } from "@/ui/primitives/avatar";

/** Reads the session, so it streams in behind the shell's Suspense boundary. */
export async function UserChip() {
  const user = await requireUser();
  return (
    <UserMenu
      name={user.displayName}
      instrument={user.instrument}
      avatar={avatarUrl(user)}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
