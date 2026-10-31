// Local-storage persistence for the Trip Dashboard — auto-saves every edit
// so the user's progress survives refreshes without a full page reload.
const KEY = "dheevoy_trip_dashboard_v1";

export function saveDashboardState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — non-blocking
  }
}

export function loadDashboardState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDashboardState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // non-blocking
  }
}