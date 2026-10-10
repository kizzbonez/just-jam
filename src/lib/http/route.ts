import "server-only";
import { unstable_rethrow } from "next/navigation";
import { connection, NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import {
  requireApiAdmin,
  requireApiUser,
  type SessionUser,
} from "@/features/auth/server/current-user";
import { badRequest, forbidden, tooMany } from "@/lib/http/errors";
import { isTrustedOrigin } from "@/lib/http/origin";
import { allow, type RateRule } from "@/lib/http/rate-limit";
import { errorResponse } from "@/lib/http/respond";

export interface RouteOptions<S extends z.ZodType | undefined = undefined> {
  /** Parsed and validated JSON body. Omit for routes that read the raw body. */
  body?: S;
  /** Per-client-address limit applied before any work is done. */
  limit?: RateRule;
}

export interface RouteContext<B, P, U> {
  req: NextRequest;
  body: B;
  params: P;
  user: U;
  meta: RequestMeta;
}

export interface RequestMeta {
  ip: string;
  userAgent: string | null;
}

type BodyOf<S> = S extends z.ZodType ? z.infer<S> : undefined;
type Handler<S, P, U> = (ctx: RouteContext<BodyOf<S>, P, U>) => Promise<unknown>;
type Segment<P> = { params: Promise<P> };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requestMeta(req: NextRequest): RequestMeta {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: forwarded || "unknown", userAgent: req.headers.get("user-agent") };
}

function guard(req: NextRequest, limit: RateRule | undefined, ip: string): void {
  const safe = SAFE_METHODS.has(req.method);
  if (!safe && !isTrustedOrigin(req.headers.get("origin"), req.headers.get("host"))) {
    throw forbidden("Cross-origin request blocked.");
  }
  if (limit && !allow(limit, ip)) throw tooMany();
}

async function readBody<S extends z.ZodType | undefined>(
  req: NextRequest,
  schema: S,
): Promise<BodyOf<S>> {
  if (!schema) return undefined as BodyOf<S>;
  const raw = await req.json().catch(() => {
    throw badRequest("Request body must be JSON.");
  });
  return schema.parse(raw) as BodyOf<S>;
}

function build<S extends z.ZodType | undefined, P, U>(
  opts: RouteOptions<S>,
  resolveUser: () => Promise<U>,
  handler: Handler<S, P, U>,
) {
  return async (req: NextRequest, segment: Segment<P>): Promise<Response> => {
    try {
      await connection();
      const meta = requestMeta(req);
      guard(req, opts.limit, meta.ip);
      const user = await resolveUser();
      const body = await readBody(req, opts.body as S);
      const params = await segment.params;
      const result = await handler({ req, body, params, user, meta });
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (error) {
      // Framework control-flow errors (dynamic bail-out, redirects) must pass through.
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}

/** No session required. */
export const publicRoute = <S extends z.ZodType | undefined = undefined, P = object>(
  opts: RouteOptions<S>,
  handler: Handler<S, P, null>,
) => build(opts, async () => null, handler);

/** Requires a live session. */
export const userRoute = <S extends z.ZodType | undefined = undefined, P = object>(
  opts: RouteOptions<S>,
  handler: Handler<S, P, SessionUser>,
) => build(opts, requireApiUser, handler);

/** Requires a live session with the ADMIN role. */
export const adminRoute = <S extends z.ZodType | undefined = undefined, P = object>(
  opts: RouteOptions<S>,
  handler: Handler<S, P, SessionUser>,
) => build(opts, requireApiAdmin, handler);
