// localStorage-based draft persistence for trip planning state.
// Survives page refreshes and navigation — restores the user's in-progress trip.

const KEY = "dheevoy_draft_state";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function saveDraftState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch (_) {}
}

export function loadDraftState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > TTL_MS) {
      clearDraftState();
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearDraftState() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}