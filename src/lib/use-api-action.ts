"use client";

import { useCallback, useState } from "react";
import { ApiError, type FieldErrors } from "@/lib/api-client";

interface ActionState {
  pending: boolean;
  error: string | null;
  fields: FieldErrors;
}

const IDLE: ActionState = { pending: false, error: null, fields: {} };

/**
 * Tracks one request at a time for a form: pending flag, a form-level message
 * and per-field messages. `run` resolves to undefined when the request failed.
 */
export function useApiAction() {
  const [state, setState] = useState<ActionState>(IDLE);

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    setState({ pending: true, error: null, fields: {} });
    try {
      const result = await task();
      setState(IDLE);
      return result;
    } catch (error) {
      const fields = error instanceof ApiError ? error.fields : {};
      const message = error instanceof Error ? error.message : "Request failed. Try again.";
      setState({ pending: false, error: message, fields });
      return undefined;
    }
  }, []);

  return { ...state, run };
}
