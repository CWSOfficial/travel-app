import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { secrets } from "base44:runtime";
import { issueToken, SECRET_KEY } from "../../shared/sessionToken.ts";
import { getClientIp } from "../../shared/rateLimiter.ts";

// issueSessionToken — issues a short-lived, HMAC-signed anonymous session token
// that the client attaches to every call to the credit-gated functions
// (generateAiContent, searchDestinationsGlobal). The token gives those
// functions a server-verified, unspoofable per-browser identity (the nonce)
// even for guests who are not logged in, so per-user rate limiting can be tied
// to a verified token rather than to an IP that a caller could rotate.
//
// The endpoint is public by design (guests need it), but it is still validated
// to only come through the Base44 platform (createClientFromRequest) and
// rate-limited per IP so a single seller can't harvest unbounded tokens. The
// token itself contains no privileges beyond "this browser obtained a token
// recently" — all expensive work is gated inside the consuming functions.

const RATE_LIMIT_MAX = 60; // 60 token issues per minute per IP

export default async function (req: Request): Promise<Response> {
  try {
    let base44;
    try {
      base44 = createClientFromRequest(req);
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(req);

    // Per-IP cap on token issuance (DB-backed so it holds across instances).
    const now = Date.now();
    try {
      const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ key: `issueSessionToken:${clientIp}` });
      const bucket = buckets[0];
      if (bucket && now <= bucket.reset_at) {
        const newCount = bucket.count + 1;
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: newCount });
        if (newCount > RATE_LIMIT_MAX) {
          return Response.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
        }
      } else if (bucket) {
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: 1, reset_at: now + 60_000 });
      } else {
        await base44.asServiceRole.entities.RateLimitBucket.create({ key: `issueSessionToken:${clientIp}`, count: 1, reset_at: now + 60_000 });
      }
    } catch (e: any) {
      console.error("issueSessionToken: rate-limit DB check failed, allowing:", e?.message);
    }

    const secret = secrets.get(SECRET_KEY);
    if (!secret) {
      console.error("issueSessionToken: SESSION_TOKEN_SECRET not configured");
      return Response.json({ error: "Server not configured" }, { status: 500 });
    }

    const token = await issueToken(secret);
    return Response.json({ token });
  } catch (error: any) {
    console.error("issueSessionToken error:", error?.message);
    return Response.json({ error: "internal_error", message: error?.message || "error" }, { status: 500 });
  }
}