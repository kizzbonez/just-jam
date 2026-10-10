export type FieldErrors = Record<string, string>;

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: FieldErrors };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldErrors;

  constructor(status: number, body: ErrorBody) {
    super(body.error?.message ?? "Request failed. Try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = body.error?.code ?? "unknown";
    this.fields = body.error?.fields ?? {};
  }
}

export interface ApiInit {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/** JSON fetch against this app's own API. Throws `ApiError` on any non-2xx. */
export async function api<T = { ok: true }>(path: string, init: ApiInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const response = await fetch(path, {
    method: init.method ?? (hasBody ? "POST" : "GET"),
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });
  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) throw new ApiError(response.status, data as ErrorBody);
  return data as T;
}
