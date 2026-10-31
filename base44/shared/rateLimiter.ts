// Persistent per-IP rate limiter (fixed window, DB-backed via RateLimitBucket).
// Shared by backend functions that need a global cap across all function
// instances (cold starts + concurrent traffic make in-memory Maps per-instance,
// so the cap would not hold globally). Each function names its own window/max.
//
// Usage:
//   const allowed = await checkRateLimit(base44, "fetchNearbyPlaces", ip, 60_000, 20);
//   if (!allowed) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

const RATE_LIMIT_WINDOW_MS_DEFAULT = 60_000; // 1 minute

/**
 * Checks and increments a DB-backed fixed-window rate-limit counter for the
 * given function name + client IP. Returns true if the request is allowed,
 * false if the per-window cap has been exceeded.
 *
 * Fails open on transient DB errors — the platform-token gate
 * (createClientFromRequest) still protects the endpoint, and a transient DB
 * error should not break the feature for legitimate users.
 */
export async function checkRateLimit(
  base44: any,
  functionName: string,
  ip: string,
  windowMs: number = RATE_LIMIT_WINDOW_MS_DEFAULT,
  maxRequests: number = 20,
): Promise<boolean> {
  const key = `${functionName}:${ip}`;
  const now = Date.now();
  try {
    const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ key });
    const bucket = buckets[0];
    if (!bucket || now > bucket.reset_at) {
      // New or expired window — (re)start the counter at 1
      if (bucket) {
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
          count: 1,
          reset_at: now + windowMs,
        });
      } else {
        await base44.asServiceRole.entities.RateLimitBucket.create({
          key,
          count: 1,
          reset_at: now + windowMs,
        });
      }
      return true;
    }
    // Active window — increment and enforce the cap
    const newCount = bucket.count + 1;
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: newCount });
    return newCount <= maxRequests;
  } catch (e: any) {
    console.error(`${functionName}: rate-limit DB check failed, allowing:`, e?.message);
    return true;
  }
}

/**
 * Extracts a trusted client IP from request headers.
 *
 * The Base44 platform is fronted by Cloudflare, which sets CF-Connecting-IP
 * to the real visitor IP and overwrites any client-supplied value — it cannot
 * be spoofed. X-Real-IP is also set by the platform to the same value.
 *
 * X-Forwarded-For is intentionally NOT used: its leftmost value is
 * client-controlled (a caller can set `X-Forwarded-For: fake_ip` to make
 * every request appear to come from a different address), which would let
 * an attacker rotate apparent IPs and bypass per-IP rate limits. Using the
 * Cloudflare-trusted header closes that hole.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Token-keyed fixed-window rate limiter — same DB-backed bucket pattern as
 * checkRateLimit, but keyed by a verified session-token identity (the nonce)
 * instead of an IP. Because the token is server-signed, a caller cannot rotate
 * it the way they can rotate IPs, so this is the primary bound for credit-
 * gated functions. Fails open on transient DB errors only when a token was
 * already verified (the HMAC check is the strong gate that cannot be forged).
 */
export async function checkTokenRateLimit(
  base44: any,
  functionName: string,
  tokenIdentity: string,
  windowMs: number = RATE_LIMIT_WINDOW_MS_DEFAULT,
  maxRequests: number = 20,
): Promise<boolean> {
  const key = `${functionName}:token:${tokenIdentity}`;
  const now = Date.now();
  try {
    const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ key });
    const bucket = buckets[0];
    if (!bucket || now > bucket.reset_at) {
      if (bucket) {
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
          count: 1,
          reset_at: now + windowMs,
        });
      } else {
        await base44.asServiceRole.entities.RateLimitBucket.create({
          key,
          count: 1,
          reset_at: now + windowMs,
        });
      }
      return true;
    }
    const newCount = bucket.count + 1;
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: newCount });
    return newCount <= maxRequests;
  } catch (e: any) {
    console.error(`${functionName}: token rate-limit DB check failed, allowing:`, e?.message);
    return true;
  }
}