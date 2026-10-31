// Client-side session-token manager.
//
// On first use the browser asks issueSessionToken for a server-signed,
// expiring token (HMAC-signed with a server-only secret), then caches it in
// localStorage so it is reused across the session instead of re-issuing on
// every call. The token itself is opaque to the client — its value is that the
// server can cryptographically verify it and derive a stable per-browser
// identity (the nonce) for rate limiting. Attaching it to every call is
// handled centrally in base44Client.js so no calling page has to think about it.

const STORAGE_KEY = "dheevoy_session_token_v1";

let inFlight = null; // shared promise so concurrent callers fetch once

// Returns the cached token string, or null if none is stored.
// Synchronous — used by the invoke wrapper to decide whether to attach a token.
export function getCachedSessionToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Returns true if the token is missing, malformed, or past its expiry.
// Token format: nonce.expiryEpochMs.signature — the expiry is the 2nd segment.
function isTokenExpired(token) {
  if (!token || typeof token !== "string") return true;
  const parts = token.split(".");
  if (parts.length !== 3) return true;
  const expiry = Number(parts[1]);
  if (!Number.isFinite(expiry)) return true;
  return expiry <= Date.now();
}

// Removes the cached token so the next ensureSessionToken call fetches a fresh one.
// Called when the backend rejects a token as expired/invalid.
export function clearCachedSessionToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode — nothing to remove */
  }
}

// Ensures a fresh session token exists, fetching + caching one if absent or
// expired. `base44` is passed in to avoid a circular import, and because the
// token-issuing endpoint is NOT itself token-gated (so no recursion).
// Callers fall back to a passed-through call (no token) if issuance ever
// fails — a token outage must not break the AI flows for legitimate users.
export async function ensureSessionToken(base44) {
  const cached = getCachedSessionToken();
  if (cached && !isTokenExpired(cached)) return cached;

  // Cached token is missing or expired — clear it so a fresh one is fetched.
  if (cached) clearCachedSessionToken();

  if (inFlight) return inFlight; // another caller is already fetching

  inFlight = (async () => {
    const existing = getCachedSessionToken();
    if (existing && !isTokenExpired(existing)) return existing;
    if (existing) clearCachedSessionToken();
    try {
      const res = await base44.functions.invoke("issueSessionToken", {});
      const token = res?.data?.token || res?.token;
      if (!token) return null;
      try {
        localStorage.setItem(STORAGE_KEY, token);
      } catch {
        /* private mode — just use it for this session */
      }
      return token;
    } catch (e) {
      console.error("ensureSessionToken: token issuance failed", e?.message);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}