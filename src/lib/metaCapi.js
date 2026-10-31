/**
 * Meta Conversions API (CAPI) — frontend tracking services.
 *
 * Each track* helper:
 *  1. Generates an event_id (stable for once-per-user events, random for
 *     discrete actions).
 *  2. Fires the browser Meta Pixel standard event with the SAME event_id
 *     (when analytics consent is granted) so Meta can dedupe pixel + CAPI.
 *  3. Calls the `sendMetaCapiEvent` backend function (server-side send) with
 *     the same event_id — fire-and-forget, never blocks the UI.
 *
 * PII (email/phone/name) is NOT passed from the frontend. The backend reads
 * the authenticated user via base44.auth.me() and hashes server-side.
 *
 * DheeVoy is a FREE platform — no Purchase events or fake transaction values
 * are ever sent.
 */

import { base44 } from "@/api/base44Client";
import {
  trackMetaPixelStandard,
  trackMetaPixel,
  hasAnalyticsConsent,
} from "@/lib/metaPixel";

// ── event_id helpers ──

/** Stable, deterministic id for once-per-user events (Lead, CompleteRegistration). */
function stableEventId(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return "ev_" + (h >>> 0).toString(16) + "_" + seed.length.toString(16);
}

/** Random id for discrete actions (ViewContent, Search, Contact, AffiliateClick). */
function randomEventId() {
  try {
    return "ev_" + crypto.randomUUID();
  } catch {
    return "ev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function currentUrl() {
  try {
    return window.location.href;
  } catch {
    return null;
  }
}

function userAgent() {
  try {
    return navigator.userAgent;
  } catch {
    return null;
  }
}

/** Fire-and-forget server-side send. Never throws, never blocks. */
function sendCapi({ event_name, event_id, dedup_scope, custom_data }) {
  try {
    base44.functions
      .invoke("sendMetaCapiEvent", {
        event_name,
        event_id,
        dedup_scope,
        event_source_url: currentUrl(),
        client_user_agent: userAgent(),
        custom_data,
      })
      .catch(() => {});
  } catch {
    // silent
  }
}

/** Fire both pixel (if consent) + CAPI with the same event_id. */
function fireBoth(event_name, event_id, custom_data, dedup_scope = "event") {
  if (hasAnalyticsConsent()) {
    trackMetaPixelStandard(event_name, custom_data || {}, event_id);
  }
  sendCapi({ event_name, event_id, dedup_scope, custom_data });
}

// ── Public track* services ──

/**
 * CompleteRegistration — fires once per user when a new account is fully
 * created (OTP verified). dedup_scope="user" guarantees it never repeats on
 * login/edit/refresh.
 * @param seed - stable identifier available at the trigger (email or user id)
 */
export function trackCompleteRegistration(seed) {
  const event_id = stableEventId(`CompleteRegistration:${seed || "guest"}`);
  const custom_data = { content_name: "dheevoy_signup" };
  fireBoth("CompleteRegistration", event_id, custom_data, "user");
}

/**
 * Lead — fires once per user when they submit meaningful profile info that
 * lets DheeVoy treat them as a qualified lead (e.g. phone number saved).
 * dedup_scope="user" → fires once per user ever.
 * @param seed - stable identifier (user id or email)
 */
export function trackLead(seed, extra = {}) {
  const event_id = stableEventId(`Lead:${seed || "guest"}`);
  const custom_data = { content_name: "dheevoy_profile", ...extra };
  fireBoth("Lead", event_id, custom_data, "user");
}

/**
 * ViewContent — meaningful content/service engagement (e.g. itinerary
 * generated). One per action (dedup by event_id).
 */
export function trackViewContent(contentType, contentId = null, extra = {}) {
  const event_id = randomEventId();
  const custom_data = { content_name: contentType, ...extra };
  if (contentId) custom_data.content_ids = [contentId];
  fireBoth("ViewContent", event_id, custom_data, "event");
}

/**
 * Search — actual meaningful search submission (destination selected, etc.).
 * NOT fired on input focus. One per action.
 */
export function trackSearch(searchTerm, pillar = "general", extra = {}) {
  const event_id = randomEventId();
  const custom_data = {
    search_string: searchTerm,
    content_category: pillar,
    ...extra,
  };
  fireBoth("Search", event_id, custom_data, "event");
}

/**
 * Contact — actual contact initiation (support message sent). NOT fired on
 * contact page view. One per action.
 */
export function trackContact(method = "email", extra = {}) {
  const event_id = randomEventId();
  const custom_data = {
    content_name: "dheevoy_contact",
    content_category: method,
    ...extra,
  };
  fireBoth("Contact", event_id, custom_data, "event");
}

/**
 * Affiliate outbound engagement — custom event (NOT Purchase). Best-effort
 * pixel + CAPI send so Meta can report on affiliate engagement by pillar.
 * The authoritative click log lives in the AffiliateLinkClick entity.
 */
export function trackAffiliateEngagement({ pillar, partner_name, destination, page }) {
  const event_id = randomEventId();
  const custom_data = {
    content_name: "affiliate_click",
    content_category: pillar,
    partner_name,
  };
  if (destination) custom_data.destination = destination;
  if (page) custom_data.page = page;
  if (hasAnalyticsConsent()) {
    trackMetaPixel("AffiliateClick", custom_data);
  }
  sendCapi({ event_name: "AffiliateClick", event_id, dedup_scope: "event", custom_data });
}