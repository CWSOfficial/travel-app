// Guest claim token — cryptographically random identifier stored in localStorage
// for the current browser session. Used to bind guest-created AiSessionLog
// records to the browser that created them, so that after signup/login only
// records created in THIS browser (with the matching claim hash) can be claimed
// by the authenticated user. Prevents cross-user report planting via email-match
// alone.
//
// The raw token never leaves the browser. Only its SHA-256 hash is stored on
// AiSessionLog records (guest_claim_hash). linkGuestReports re-hashes the raw
// token server-side and compares. An attacker who plants a record with a
// victim's email cannot know the victim's localStorage token, so the hash will
// never match and the planted record is left unclaimed.

const KEY = "dheevoy_guest_claim";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns the raw claim token from localStorage, generating one if absent or
 * expired. Sync — safe to call inside invoke payloads.
 */
export function getGuestClaimToken() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.createdAt > TTL_MS) {
        const token = generateToken();
        localStorage.setItem(KEY, JSON.stringify({ token, createdAt: Date.now() }));
        return token;
      }
      return parsed.token;
    }
    const token = generateToken();
    localStorage.setItem(KEY, JSON.stringify({ token, createdAt: Date.now() }));
    return token;
  } catch {
    return null; // storage unavailable (private mode etc.)
  }
}

/**
 * Returns the SHA-256 hex hash of the claim token, or null if unavailable.
 * Async — call inside an async flow handler.
 */
export async function getGuestClaimHash() {
  const token = getGuestClaimToken();
  if (!token) return null;
  try {
    const buf = new TextEncoder().encode(token);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}