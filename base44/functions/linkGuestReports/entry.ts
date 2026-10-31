import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Reconciles "orphaned" AiSessionLog rows: logs captured by a guest
// (created_by_id null) whose contact_email matches the authenticated caller's
// email AND whose guest_claim_hash matches the caller's browser claim token.
//
// SECURITY: Email match alone is no longer sufficient. The caller must supply
// the raw claim token from their browser's localStorage. We hash it server-side
// and compare against guest_claim_hash on the orphan record. This prevents an
// attacker from planting records with a victim's email and having them
// auto-linked when the victim logs in.
//
// Legacy orphan records with null guest_claim_hash are NOT linked — they are
// left unclaimed rather than risk cross-user contamination.
//
// created_by_id is a protected built-in and cannot be reassigned via
// updateMany, so instead we copy each orphan into a new log created through
// the user-scoped client (which sets created_by_id = user.id) and then delete
// the orphan. The user then sees those reports under their own account via RLS.

async function sha256Hex(value: string): Promise<string> {
  const buf = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.email)
      return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Claim token: required to prevent cross-user report planting ──
    const body = await req.json().catch(() => ({}));
    const claimToken = body?.claim_token || body?.args?.claim_token || null;
    if (!claimToken) {
      return Response.json({ linked: 0, checked: 0, reason: 'claim_token required' });
    }
    const claimHash = await sha256Hex(claimToken);

    const rows = await base44.asServiceRole.entities.AiSessionLog.filter(
      { contact_email: user.email },
      '-created_date',
      500
    );
    // Only link orphans that carry a matching guest_claim_hash — email match
    // alone is no longer sufficient. Legacy orphans with null guest_claim_hash
    // are skipped (left unclaimed).
    const claimable = rows.filter(
      (l: any) => !l.created_by_id && l.guest_claim_hash && l.guest_claim_hash === claimHash
    );

    let linked = 0;
    for (const o of claimable) {
      try {
        const { id, created_by_id, created_date, updated_date, ...data } = o;
        await base44.entities.AiSessionLog.create(data); // user-scoped → owned by user
        await base44.asServiceRole.entities.AiSessionLog.delete(o.id);
        linked++;
      } catch (e) {
        /* skip this one; retried on next load */
      }
    }
    return Response.json({ linked, checked: claimable.length });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'internal_error' }, { status: 500 });
  }
}