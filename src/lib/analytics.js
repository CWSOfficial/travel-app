/**
 * GA4 event tracking utility.
 * Safely calls window.gtag if loaded; no-ops otherwise.
 *
 * Two data streams are configured in index.html:
 *   G-2KNLT6YYSK — shared with the landing page (cross-subdomain)
 *   G-6XL6XLR386 — app-only stream (isolates app.dheevoy.com events)
 *
 * gtag('event', ...) without send_to fires to ALL configured IDs,
 * so every trackEvent call below automatically reaches both streams.
 * The app-only stream (G-6XL6XLR386) receives data solely from this
 * app since the tag exists only on app.dheevoy.com pages.
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}