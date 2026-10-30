// Best-effort per-visitor limit. State lives in one Worker isolate, so it is not a
// global quota, but it stops a single client from draining the shared Workers AI
// allocation in a tight loop. Requests without a client IP header are not limited.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
export const LIMITS = { chat: { max: 20, windowMs: 60_000 }, transcribe: { max: 20, windowMs: 60_000 } } as const;
export function rateLimited(request: Request, kind: keyof typeof LIMITS, now = Date.now()): number {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return 0;
  const { max, windowMs } = LIMITS[kind];
  const key = `${kind}:${ip}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  bucket.count++;
  return bucket.count > max ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}
export function resetRateLimits() { buckets.clear(); }
