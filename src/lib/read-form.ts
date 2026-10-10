import type { FormEvent } from "react";

/** Stops the native submit and returns the form's text fields by name. */
export function readForm(event: FormEvent<HTMLFormElement>): Record<string, string> {
  event.preventDefault();
  const values: Record<string, string> = {};
  for (const [key, value] of new FormData(event.currentTarget)) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
