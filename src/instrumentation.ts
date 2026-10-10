/** Runs once when the server process starts. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { announceSetupToken } = await import("@/features/auth/server/setup-token");
  await announceSetupToken().catch((error: unknown) => {
    console.warn("[tonelink] could not prepare the setup token yet:", error);
  });
}
