export interface RateRule {
  name: string;
  max: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 20_000;
const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Fixed-window counter held in process memory, which fits the single web
 * container this app ships as. Returns false once the caller is over the limit.
 */
export function allow(rule: RateRule, subject: string, now = Date.now()): boolean {
  if (buckets.size > MAX_BUCKETS) sweep(now);
  const key = `${rule.name}:${subject}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= rule.max;
}

export function resetRateLimits(): void {
  buckets.clear();
}
