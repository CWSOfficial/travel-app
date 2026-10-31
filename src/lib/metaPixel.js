/**
 * Meta (Facebook) Pixel — consent-gated loader and tracker.
 *
 * The pixel is NEVER loaded unconditionally. It only initialises after the
 * user has accepted analytics cookies via the existing CookieBanner
 * (localStorage key "dheetrip_cookie_consent", shape { analytics: boolean }).
 *
 *   initMetaPixel()  — call on app load and when consent is granted
 *                      mid-session. No-op if consent is missing/declined
 *                      or the pixel is already loaded.
 *   trackMetaPixel() — fire a custom event. No-op until the pixel is loaded.
 *
 * GA4 tracking is untouched; this module runs entirely alongside it.
 */

const PIXEL_ID = "1006147395778048";
const CONSENT_KEY = "dheetrip_cookie_consent";

/** True only when the user has explicitly accepted analytics cookies. */
export function hasAnalyticsConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && parsed.analytics === true;
  } catch {
    return false;
  }
}

let initialised = false;

/**
 * Injects the Meta Pixel base code + PageView, but only if the user has
 * accepted analytics cookies. Safe to call repeatedly — no-ops once loaded
 * or when consent is absent. Calling this after a mid-session "Accept" loads
 * the pixel without requiring a page reload.
 */
export function initMetaPixel() {
  if (initialised) return;
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  /* eslint-disable */
  (function (f, b, e, v) {
    if (f.fbq) return;
    const n = (f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e);
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
  initialised = true;
}

/**
 * Fire a Meta Pixel custom event. No-op until initMetaPixel() has loaded
 * the pixel (i.e. until analytics consent is granted).
 * @param {string} event  - custom event name, e.g. "TripStarted"
 * @param {object} [params] - optional event properties
 */
export function trackMetaPixel(event, params = {}) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("trackCustom", event, params);
  }
}

/**
 * Fire a Meta Pixel STANDARD event (Lead, CompleteRegistration, ViewContent,
 * Search, Contact) with an event_id. The same event_id must be used for the
 * matching server-side CAPI event so Meta can deduplicate pixel + CAPI.
 * No-op until initMetaPixel() has loaded the pixel (analytics consent granted).
 * @param {string} event  - standard event name
 * @param {object} params - event properties
 * @param {string} [eventId] - shared dedup id (matches the CAPI event_id)
 */
export function trackMetaPixelStandard(event, params = {}, eventId) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) {
      window.fbq("track", event, params, { eventID: eventId });
    } else {
      window.fbq("track", event, params);
    }
  }
}