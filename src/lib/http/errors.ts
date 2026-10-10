export type FieldErrors = Record<string, string>;

interface AppErrorInit {
  status: number;
  code: string;
  message: string;
  fields?: FieldErrors;
}

/** An error that is safe to show to the caller. Anything else becomes a 500. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: FieldErrors;

  constructor(init: AppErrorInit) {
    super(init.message);
    this.name = "AppError";
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields;
  }
}

export const badRequest = (message: string, fields?: FieldErrors) =>
  new AppError({ status: 400, code: "bad_request", message, fields });

export const unauthorized = (message = "Sign in to continue.") =>
  new AppError({ status: 401, code: "unauthorized", message });

export const forbidden = (message = "You are not allowed to do that.") =>
  new AppError({ status: 403, code: "forbidden", message });

export const notFound = (message = "Not found.") =>
  new AppError({ status: 404, code: "not_found", message });

export const conflict = (message: string, fields?: FieldErrors) =>
  new AppError({ status: 409, code: "conflict", message, fields });

export const tooMany = (message = "Too many attempts. Wait a moment and try again.") =>
  new AppError({ status: 429, code: "rate_limited", message });

export const unavailable = (message: string) =>
  new AppError({ status: 503, code: "unavailable", message });
