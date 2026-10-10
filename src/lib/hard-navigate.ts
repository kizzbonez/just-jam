/**
 * Full page load instead of a client-side transition. Used when the session
 * changes, so no prefetched or cached view from the previous identity survives.
 */
export function hardNavigate(path: string): void {
  window.location.href = path;
}
