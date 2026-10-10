import { endSession } from "@/features/auth/server/sessions";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute({}, ({ user }) => endSession(user.sessionId));
