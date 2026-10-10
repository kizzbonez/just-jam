const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value: number) => String(value).padStart(2, "0");

/** Fixed UTC format, so server and browser render the same text. */
export function formatUtc(iso: string): string {
  const date = new Date(iso);
  const day = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return `${day}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad/, "iOS"],
  [/Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

const firstMatch = (table: [RegExp, string][], text: string) =>
  table.find(([pattern]) => pattern.test(text))?.[1];

/** "Chrome on Windows" from a User-Agent header, or a neutral fallback. */
export function describeAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = firstMatch(BROWSERS, userAgent) ?? "Browser";
  const system = firstMatch(SYSTEMS, userAgent);
  return system ? `${browser} on ${system}` : browser;
}
