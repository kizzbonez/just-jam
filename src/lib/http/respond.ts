import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, type FieldErrors } from "@/lib/http/errors";

function fieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] ??= issue.message;
  }
  return fields;
}

const body = (code: string, message: string, fields?: FieldErrors) => ({
  error: { code, message, fields },
});

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(body(error.code, error.message, error.fields), {
      status: error.status,
    });
  }
  if (error instanceof ZodError) {
    const payload = body("invalid_input", "Check the highlighted fields.", fieldErrors(error));
    return NextResponse.json(payload, { status: 400 });
  }
  console.error("[tonelink] unhandled route error", error);
  return NextResponse.json(body("internal", "Something went wrong on our side."), {
    status: 500,
  });
}
