import { base44 } from "@/api/base44Client";
import { trackAffiliateEngagement } from "@/lib/metaCapi";

/**
 * Fire-and-forget affiliate outbound click tracker. Never blocks navigation.
 *
 * Captures (for internal analytics + future partner postback matching):
 *  - pillar:   which DheeVoy pillar generated the click (PLAN / PREPARE / NEARBY)
 *  - partner:  which affiliate partner was clicked
 *  - destination / service clicked
 *  - which DheeVoy page generated the click
 *  - timestamp + anonymous/session/user attribution (via created_by_id)
 *
 * Also fires a Meta custom event "AffiliateClick" (NOT Purchase — DheeVoy is
 * free) via both the browser pixel and server-side CAPI for Meta reporting.
 *
 * @param {object} opts
 * @param {string} opts.partner_name  - e.g. "Aviasales"
 * @param {string} [opts.affiliate_link_id] - AffiliateLink record id
 * @param {"PLAN"|"PREPARE"|"NEARBY"|"general"} [opts.pillar] - source pillar
 * @param {string} [opts.partner_id]  - inbound attribution partner id
 * @param {"flight"|"hotel"|"general"} opts.context
 * @param {string} [opts.page]        - component name
 * @param {string} [opts.destination] - trip destination
 */
export function trackAffiliateClick({
  partner_name,
  affiliate_link_id,
  pillar = "general",
  partner_id,
  context,
  page,
  destination,
}) {
  // Meta pixel + CAPI custom event (best-effort, never blocks)
  trackAffiliateEngagement({ pillar, partner_name, destination, page });

  // Authoritative internal click log
  base44.entities.AffiliateLinkClick.create({
    partner_name,
    affiliate_link_id: affiliate_link_id || undefined,
    pillar,
    partner_id: partner_id || undefined,
    context,
    page: page || undefined,
    destination: destination || undefined,
    clicked_at: new Date().toISOString(),
  }).catch(() => {}); // never block the user
}