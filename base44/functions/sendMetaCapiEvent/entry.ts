import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

/**
 * Meta Conversions API (CAPI) — shared server-side event sender.
 *
 * SECURITY:
 *  - The Meta access token (META_CAPI_ACCESS_TOKEN) and Dataset/Pixel ID
 *    (META_DATASET_ID) are read from Base44 secrets and NEVER exposed to the
 *    client. They are never logged and never returned in the response.
 *  - Customer information (email, phone, name, city, country) is normalised and
 *    SHA-256 hashed server-side before being sent to Meta. Raw PII is never
 *    sent. client_user_agent is sent unhashed (per Meta spec).
 *  - The visitor IP is captured server-side from request headers
 *    (client_ip_address) — never trusted from a browser-supplied value.
 *
 * DEDUPLICATION:
 *  - A MetaCapiEventLog row is keyed by dedup_key. For once-per-user events
 *    (Lead, CompleteRegistration) dedup_scope="user" → dedup_key is
 *    `event_name:user_id`, so retries/refreshes/revisits never double-fire.
 *    For discrete actions (ViewContent, Search, Contact) dedup_scope="event"
 *    → dedup_key is the caller-supplied event_id.
 *  - If a row with the same dedup_key already has status "sent", the event is
 *    skipped (deduped) and not re-sent to Meta.
 *
 * NON-BLOCKING:
 *  - Meta API failures never throw to the caller. A safe { ok: false } is
 *    returned; the original event_id and event_time are preserved across the
 *  - single retry so retries never create duplicate conversions.
 *
 * TEST EVENTS:
 *  - If META_TEST_EVENT_CODE secret is set (or a per-call test_event_code is
 *    passed), events are sent as test events — visible in Meta Events Manager
 *    "Test Events" tab and excluded from production reporting.
 */

const META_GRAPH_VERSION = "v21.0";
const META_ENDPOINT = (datasetId: string) =>
  `https://graph.facebook.com/${META_GRAPH_VERSION}/${datasetId}/events`;

// ── Event name allowlist — only these Meta events may be sent ──
const ALLOWED_EVENTS = new Set([
  "CompleteRegistration",
  "Lead",
  "ViewContent",
  "Search",
  "Contact",
  "AffiliateClick",
]);

// ── Custom_data key allowlist per event — unknown keys are stripped ──
const CUSTOM_DATA_SCHEMA: Record<string, Set<string>> = {
  CompleteRegistration: new Set(["content_name"]),
  Lead: new Set(["content_name"]),
  ViewContent: new Set(["content_name", "content_ids"]),
  Search: new Set(["search_string", "content_category"]),
  Contact: new Set(["content_name", "content_category"]),
  AffiliateClick: new Set(["content_name", "content_category", "partner_name", "destination", "page"]),
};

// ── Per-user rate limit (15 CAPI events / minute) ──
const USER_RATE_LIMIT_MAX = 15;
const USER_RATE_LIMIT_WINDOW_MS = 60_000;

// ── Normalisation helpers ──

function normalizeEmail(email: any): string | null {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  return e || null;
}

function normalizePhone(phone: any): string | null {
  if (!phone) return null;
  // Meta expects E.164; keep digits (and a leading +) for hashing.
  let p = String(phone).trim().replace(/[^\d+]/g, "");
  if (!p) return null;
  return p;
}

function normalizeName(name: any): string | null {
  if (!name) return null;
  let n = String(name).trim().toLowerCase().replace(/[^a-z\s]/g, "");
  n = n.replace(/\s+/g, " ");
  return n || null;
}

function normalizeCity(city: any): string | null {
  if (!city) return null;
  const v = String(city).trim().toLowerCase().replace(/\s+/g, " ");
  return v || null;
}

function normalizeCountry(country: any): string | null {
  if (!country) return null;
  const v = String(country).trim().toLowerCase();
  // Meta wants a 2-letter ISO 3166-1 code, lowercased before hashing.
  return v.length === 2 ? v : null;
}

function normalizeGender(gender: any): string | null {
  if (!gender) return null;
  const v = String(gender).trim().toLowerCase();
  if (v === "male" || v === "m") return "m";
  if (v === "female" || v === "f") return "f";
  return null;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashIfPresent(value: string | null): Promise<string | null> {
  if (!value) return null;
  return await sha256Hex(value);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const event_name: string = body.event_name;
    const event_id: string = body.event_id;
    const dedup_scope: string = body.dedup_scope || "event"; // "user" | "event"
    const event_source_url: string | null = body.event_source_url || null;
    const client_user_agent: string | null = body.client_user_agent || null;
    const custom_data: any = body.custom_data || null;
    // SECURITY: Ignore client-provided user_data — derive identity only from
    // the authenticated Base44 user. Prevents fake PII hash injection.
    // SECURITY: Ignore client-provided test_event_code — use server config only.

    if (!event_name) {
      return Response.json(
        { ok: false, error: "event_name required" },
        { status: 400 }
      );
    }
    if (!ALLOWED_EVENTS.has(event_name)) {
      return Response.json(
        { ok: false, error: "unsupported_event_name" },
        { status: 400 }
      );
    }

    // ── Secrets ──
    const accessToken = secrets.get("META_CAPI_ACCESS_TOKEN");
    const datasetId = secrets.get("META_DATASET_ID");
    if (!accessToken || !datasetId) {
      console.error(
        "sendMetaCapiEvent: META_CAPI_ACCESS_TOKEN or META_DATASET_ID not configured"
      );
      return Response.json({ ok: false, error: "capi_not_configured" }, { status: 503 });
    }
    const testEventCode: string | null =
      secrets.get("META_TEST_EVENT_CODE") || null;

    // ── Auth: require an authenticated caller — reject anonymous events ──
    let user: any;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // ── Per-user rate limit (15 CAPI events / minute) ──
    try {
      const rlKey = `sendMetaCapiEvent:user:${user.id}`;
      const rlBuckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ key: rlKey });
      const rlBucket = rlBuckets[0];
      const now = Date.now();
      if (!rlBucket || now > rlBucket.reset_at) {
        if (rlBucket) {
          await base44.asServiceRole.entities.RateLimitBucket.update(rlBucket.id, {
            count: 1,
            reset_at: now + USER_RATE_LIMIT_WINDOW_MS,
          });
        } else {
          await base44.asServiceRole.entities.RateLimitBucket.create({
            key: rlKey,
            count: 1,
            reset_at: now + USER_RATE_LIMIT_WINDOW_MS,
          });
        }
      } else {
        const newCount = rlBucket.count + 1;
        await base44.asServiceRole.entities.RateLimitBucket.update(rlBucket.id, { count: newCount });
        if (newCount > USER_RATE_LIMIT_MAX) {
          return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
        }
      }
    } catch (e: any) {
      // Fail open — transient DB error shouldn't block legitimate tracking
      console.error("sendMetaCapiEvent: per-user rate-limit check failed:", e?.message);
    }

    // ── Dedup key ──
    const dedup_key =
      dedup_scope === "user"
        ? `${event_name}:${user ? user.id : "guest"}`
        : event_id || `${event_name}:${Date.now()}`;

    // ── Dedup check: skip if already sent (test events bypass dedup) ──
    if (!testEventCode) {
      try {
        const existing = await base44.asServiceRole.entities.MetaCapiEventLog.filter({
          dedup_key,
        });
        if (existing.some((e: any) => e.status === "sent")) {
          return Response.json({ ok: true, deduped: true, event_name });
        }
      } catch (e: any) {
        // Dedup DB failure — fail open (proceed to send), log safely.
        console.error("sendMetaCapiEvent: dedup check failed, proceeding:", e.message);
      }
    }

    // ── Build user_data (normalise + hash) ──
    // Identity derived ONLY from the authenticated Base44 user — client-supplied
    // user_data is ignored to prevent fake PII hash injection into Meta.
    const email = normalizeEmail(user?.email);
    const phone = normalizePhone(user?.phone_number);
    const firstName = normalizeName(
      user?.full_name ? String(user.full_name).split(" ")[0] : null
    );
    const lastName = normalizeName(
      user?.full_name ? String(user.full_name).split(" ").slice(1).join(" ") : null
    );
    const city = null; // not available from auth context
    const country = normalizeCountry(user?.country_code);
    const gender = null; // not available from auth context

    const userData: any = {};
    if (email) userData.em = await hashIfPresent(email);
    if (phone) userData.ph = await hashIfPresent(phone);
    if (firstName) userData.fn = await hashIfPresent(firstName);
    if (lastName) userData.ln = await hashIfPresent(lastName);
    if (city) userData.ct = await hashIfPresent(city);
    if (country) userData.country = await hashIfPresent(country);
    if (gender) userData.ge = gender; // single-char code, not hashed per Meta spec

    // Visitor IP — server-side only
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    if (clientIp) userData.client_ip_address = clientIp;
    if (client_user_agent) userData.client_user_agent = client_user_agent;

    // ── Build event payload ──
    const event_time = Math.floor(Date.now() / 1000);
    const event: any = {
      event_name,
      event_time,
      action_source: "website",
      event_id,
      event_source_url,
      user_data: userData,
    };
    // Strip unknown custom_data keys — only allowlisted keys per event pass through
    if (custom_data) {
      const allowed = CUSTOM_DATA_SCHEMA[event_name];
      if (allowed) {
        const filtered: any = {};
        for (const [k, v] of Object.entries(custom_data)) {
          if (allowed.has(k)) filtered[k] = v;
        }
        if (Object.keys(filtered).length > 0) event.custom_data = filtered;
      }
    }

    const payload: any = {
      data: [event],
      access_token: accessToken,
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    // ── Log pending attempt (for dedup + audit) — skipped for test events ──
    let logId: string | null = null;
    if (!testEventCode) {
      try {
        const log = await base44.asServiceRole.entities.MetaCapiEventLog.create({
          event_name,
          event_id,
          dedup_key,
          user_id: user?.id || null,
          event_time,
          status: "pending",
        });
        logId = log.id;
      } catch (e: any) {
        console.error("sendMetaCapiEvent: log create failed:", e.message);
      }
    }

    // ── Send to Meta (1 retry, preserving event_id + event_time) ──
    const url = META_ENDPOINT(datasetId);
    let lastErr: string | null = null;
    let success = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          success = true;
          break;
        }
        lastErr = `Meta API ${res.status}: ${JSON.stringify(data).substring(0, 300)}`;
      } catch (e: any) {
        lastErr = e.message;
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // ── Update log ──
    if (logId) {
      try {
        await base44.asServiceRole.entities.MetaCapiEventLog.update(logId, {
          status: success ? "sent" : "failed",
          response: success ? "ok" : (lastErr || "unknown_error").substring(0, 300),
        });
      } catch (e: any) {
        console.error("sendMetaCapiEvent: log update failed:", e.message);
      }
    }

    if (!success) {
      console.error("sendMetaCapiEvent: send failed for", event_name, lastErr);
      // Safe response — never exposes token or Meta error detail to the client.
      return Response.json({ ok: false, error: "event_send_failed" }, { status: 200 });
    }

    return Response.json({
      ok: true,
      deduped: false,
      event_name,
      test: !!testEventCode,
    });
  } catch (error: any) {
    console.error("sendMetaCapiEvent error:", error.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}