const KEY = "dheevoy_guest_session";

export function saveGuestSession(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (_) {}
}

export function loadGuestSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 2 hours
    if (Date.now() - parsed.savedAt > 2 * 60 * 60 * 1000) {
      clearGuestSession();
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearGuestSession() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}