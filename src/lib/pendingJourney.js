// Preserves an unsaved Multi-City Journey in sessionStorage before the auth
// prompt, so it can be restored and auto-saved after the user signs in.
// Used by the guest "Save This Journey" flow in MultiCityPlan.
//
// Why sessionStorage (not localStorage): a pending journey is a transient
// intent — if the user closes the tab, we don't want to auto-restore a stale
// journey on their next visit. sessionStorage is per-tab and clears on close.

const PENDING_KEY = "dheevoy_pending_journey";
const MAX_AGE_MS = 1000 * 60 * 30; // 30 min — generous enough for Google OAuth redirect

export function savePendingJourney(journey, itinerary, tripId) {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ journey, itinerary, tripId: tripId || null, savedAt: Date.now() })
    );
  } catch {
    // non-blocking — sessionStorage may be full or disabled
  }
}

export function loadPendingJourney() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.journey) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      clearPendingJourney();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingJourney() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // non-blocking
  }
}