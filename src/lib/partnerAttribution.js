// Lightweight partner-attribution tracking.
// A `partner_id` query param on any landing URL (e.g. dheevoy.com/?partner_id=senztoura)
// is captured once on app load into sessionStorage and re-used for the duration of
// the visit. No login required, no blocking if absent.

const PARTNER_KEY = "dheevoy_partner_id";

// Read partner_id from ?partner_id= on the current URL and persist it.
// Safe to call at app entry; idempotent — only writes when a param is present.
export function capturePartnerIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("partner_id");
    if (pid && pid.trim()) {
      sessionStorage.setItem(PARTNER_KEY, pid.trim());
    }
  } catch {
    /* sessionStorage unavailable — ignore */
  }
}

// Returns the stored partner_id for the current visit, or null.
export function getPartnerId() {
  try {
    return sessionStorage.getItem(PARTNER_KEY) || null;
  } catch {
    return null;
  }
}

export function clearPartnerId() {
  try {
    sessionStorage.removeItem(PARTNER_KEY);
  } catch {
    /* ignore */
  }
}