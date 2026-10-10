import { TicketRequestSchema } from "@/features/rooms/schemas";
import { issueTicket } from "@/features/rooms/server/issue-ticket";
import { userRoute } from "@/lib/http/route";

export const POST = userRoute<typeof TicketRequestSchema, { slug: string }>(
  { body: TicketRequestSchema },
  ({ user, params, body }) => issueTicket(user, params.slug, body.pin),
);
