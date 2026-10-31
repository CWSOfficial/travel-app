import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getClientIp } from '../../shared/rateLimiter.ts';

// Handles support form submissions: validates input, rate-limits per IP,
// creates a ContactSubmission record, and routes the message to the internal
// support inbox (support@dheevoy.com) — all server-side so the SendEmail
// integration is NOT an open mail relay from the client bundle. No auto-reply
// is sent to the submitter; the authenticated user's email is used as the
// verified contact identity. Requires an authenticated user.

const RATE_LIMIT_WINDOW_MS = 600_000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 3;    // 3 submissions per 10 min per IP

const TOPICS = [
  "Account Issue",
  "Billing & Subscription",
  "Technical Problem",
  "Feature Request",
  "Safety Concern",
  "Other",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkRateLimit(base44, ip: string): Promise<boolean> {
  const key = `submitSupportForm:${ip}`;
  const now = Date.now();
  try {
    const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ key });
    const bucket = buckets[0];
    if (!bucket || now > bucket.reset_at) {
      if (bucket) {
        await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
          count: 1,
          reset_at: now + RATE_LIMIT_WINDOW_MS,
        });
      } else {
        await base44.asServiceRole.entities.RateLimitBucket.create({
          key,
          count: 1,
          reset_at: now + RATE_LIMIT_WINDOW_MS,
        });
      }
      return true;
    }
    const newCount = bucket.count + 1;
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: newCount });
    return newCount <= RATE_LIMIT_MAX_REQUESTS;
  } catch (e) {
    // Fail open — a transient DB error should not block a legitimate user.
    console.error("submitSupportForm: rate-limit DB check failed, allowing:", e.message);
    return true;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Auth: reject anonymous callers ──
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Rate limit (per IP, DB-backed) ──
    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(base44, clientIp))) {
      return Response.json(
        { error: 'Too many submissions. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // ── Input validation ──
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || user?.full_name || "").toString().trim();
    const topic = (body?.topic || "").toString().trim();
    const message = (body?.message || "").toString().trim();

    // Identity verification: use the authenticated user's email rather than
    // trusting a client-supplied value. Prevents email spoofing — the support
    // team replies to the verified account email.
    const email = (user?.email || "").toString().trim().toLowerCase();

    if (!name || name.length > 100)
      return Response.json({ error: 'A valid name (max 100 chars) is required' }, { status: 400 });
    if (!email || !EMAIL_RE.test(email))
      return Response.json({ error: 'Authenticated user email is missing or invalid' }, { status: 400 });
    if (!TOPICS.includes(topic))
      return Response.json({ error: 'A valid topic is required' }, { status: 400 });
    if (!message || message.length > 2000)
      return Response.json({ error: 'A message (max 2000 chars) is required' }, { status: 400 });

    // ── Create the ContactSubmission (user-scoped → created_by_id = user.id) ──
    const sub = await base44.entities.ContactSubmission.create({
      user_id: user.id,
      name,
      email,
      topic,
      message,
      status: "new",
    });

    // ── Route the message to the internal support inbox (no auto-reply to the
    //    submitter). The verified user.email is included so the team can reply. ──
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: "support@dheevoy.com",
        from_name: "DheeVoy Support Form",
        subject: `[${topic}] ${name} — Support request ${sub.id}`,
        body: `A new support request was submitted.\n\nName: ${name}\nVerified email: ${email}\nTopic: ${topic}\nReference: ${sub.id}\n\nMessage:\n${message}\n\n— Submitted via DheeVoy Help & Support`,
      });
    } catch (e) {
      console.error("submitSupportForm: internal support email failed:", e.message);
    }

    return Response.json({ success: true, id: sub.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}