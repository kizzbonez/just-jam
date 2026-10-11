const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const isLoopback = (hostname: string) => LOOPBACK.has(hostname) || hostname.endsWith(".localhost");

/**
 * Returns an explanation when the relay address can only work on the machine
 * that runs the studio, but the page was opened from somewhere else. This is
 * what a visitor hits when the web app has been published and the relay's
 * UDP port has not.
 */
export function relayReachProblem(relayUrl: string, pageHostname: string): string | null {
  let relayHost: string;
  try {
    relayHost = new URL(relayUrl).hostname;
  } catch {
    return "This studio's audio relay address is not a valid URL. Check RELAY_PUBLIC_URL.";
  }
  if (!isLoopback(relayHost) || isLoopback(pageHostname)) return null;
  return (
    `This studio's audio relay is set up for local use only (${relayHost}), so it cannot be ` +
    "reached from this device. Whoever runs the studio needs to publish the relay's UDP port " +
    "and set RELAY_PUBLIC_URL. See Guide, Self-hosting, Playing with people elsewhere."
  );
}
