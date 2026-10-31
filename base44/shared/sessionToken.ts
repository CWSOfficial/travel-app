// Session-token utilities for server-verified anonymous caller identity.
//
// A signed, expiring token issued by the issueSessionToken function and carried
// by the client with every call to the credit-gated functions
// (generateAiContent, searchDestinationsGlobal). Because the token is HMAC-
// signed with a server-only secret (SESSION_TOKEN_SECRET), any function can
// cryptographically verify it without a login, giving a stable per-browser
// identity that a malicious caller cannot forge or swap. That identity becomes
// the primary rate-limit key, so a single user cannot rotate IPs to dodge the
// quota, and IP remains the secondary bound.

const SECRET_KEY = "SESSION_TOKEN_SECRET";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — long enough for a planning session

// Encode a raw secret into a CryptoKey for HMAC-SHA256.
async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const data = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return data;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Signs a token for the given nonce. Formats it as `nonce.expiryEpochMs.signature`
 * (all URL-safe). The signature covers the nonce and expiry, so neither can be
 * altered without invalidating the token.
 */
export async function signSessionToken(
  secret: string,
  nonce: string,
  ttlMs: number = TOKEN_TTL_MS,
): Promise<string> {
  const expiry = Date.now() + ttlMs;
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const payload = `${nonce}.${expiry}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${toHex(sig)}`;
}

export interface SessionIdentity {
  valid: boolean;
  nonce: string | null;
  reason?: string;
}

/**
 * Verifies a session token and returns its identity (the nonce) when valid.
 * The nonce doubles as the rate-limit key: it is a high-entropy random value,
 * so there is effectively one per issued token, and a valid token proves the
 * caller obtained it from issueSessionToken (the server is the only HMAC
 * signer). Invalid tokens are rejected outright rather than downgraded.
 */
export async function verifySessionToken(
  secret: string,
  token: string | null | undefined,
): Promise<SessionIdentity> {
  if (!token) return { valid: false, nonce: null, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, nonce: null, reason: "malformed" };
  const [nonce, expiryStr, sigHex] = parts;
  if (!nonce || !/^\d+$/.test(expiryStr) || !/^[0-9a-f]+$/.test(sigHex)) {
    return { valid: false, nonce: null, reason: "malformed" };
  }
  const expiry = Number(expiryStr);
  if (expiry <= Date.now()) return { valid: false, nonce: null, reason: "expired" };
  try {
    const key = await importKey(secret);
    const enc = new TextEncoder();
    const expected = toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`${nonce}.${expiry}`)));
    if (expected !== sigHex) return { valid: false, nonce: null, reason: "bad_signature" };
  } catch {
    return { valid: false, nonce: null, reason: "bad_signature" };
  }
  return { valid: true, nonce };
}

/**
 * Generates a new cryptographically-random nonce and a signed token for it.
 * Imported by the issueSessionToken function.
 */
export async function issueToken(
  secret: string,
  ttlMs: number = TOKEN_TTL_MS,
): Promise<string> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signSessionToken(secret, nonce, ttlMs);
}

// Re-export the secret name so callers read secrets.get(SECRET_KEY) uniformly.
export { SECRET_KEY };