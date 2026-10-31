import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { ensureSessionToken, clearCachedSessionToken } from '@/lib/sessionToken';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const rawBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Credit-gated backend functions — each call must carry the browser's
// server-signed session token so the backend can verify caller identity and
// rate-limit per token (not just per IP). The token is attached centrally
// here so every page that uses these functions is covered automatically.
const SESSION_PROTECTED_FUNCTIONS = new Set(['generateAiContent', 'searchDestinationsGlobal', 'fetchNearbyPlaces']);

function wrapFunctions() {
  const rawFns = rawBase44.functions;

  // Attaches the current session token to the payload (when available).
  const withToken = async (data) => {
    let token = null;
    try {
      token = await ensureSessionToken(rawBase44);
    } catch (e) {
      console.error('session token attach failed', e?.message);
    }
    return token ? { ...data, _session_token: token } : data;
  };

  return {
    ...rawFns,
    invoke: async (functionName, data = {}) => {
      if (!SESSION_PROTECTED_FUNCTIONS.has(functionName)) {
        return rawFns.invoke(functionName, data);
      }

      // First attempt with the current (possibly cached) session token.
      try {
        return await rawFns.invoke(functionName, await withToken(data));
      } catch (err) {
        // Retry ONLY on HTTP 401 (invalid/expired session token).
        // Do not retry 400, 403, 429, 500 or any other status.
        const status = err?.status || err?.statusCode || err?.response?.status;
        if (status !== 401) throw err;

        // Clear the rejected token, obtain a fresh one, retry exactly once.
        clearCachedSessionToken();
        return rawFns.invoke(functionName, await withToken(data));
      }
    }
  };
}

// Proxy that intercepts only `functions` to inject the session-token wrapper,
// passing every other property (auth, entities, integrations, analytics, …)
// straight through from the raw client.
export const base44 = new Proxy(rawBase44, {
  get(target, prop, receiver) {
    if (prop === 'functions') return wrapFunctions();
    return Reflect.get(target, prop, receiver);
  }
});