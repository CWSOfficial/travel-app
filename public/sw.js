// DheeVoy Service Worker — PWA offline app-shell support
//
// CACHE STRATEGY:
//   ✅ Static assets (JS bundles, CSS, fonts, images) → stale-while-revalidate
//   ✅ Navigation (HTML pages) → network-first, cache fallback for offline
//   ❌ Backend function calls (/functions/) → network-only, never cached
//   ❌ Stripe requests → network-only, never cached
//   ❌ Non-GET requests → network-only, never cached
//   ❌ Cross-origin API calls → network-only, never cached
//
// Version: bump CACHE_VERSION when deploying a breaking shell change.
// Stale-while-revalidate + network-first navigations ensure new Base44
// deployments propagate on the next load — users never get stuck on a
// stale version indefinitely.

const CACHE_VERSION = "dheevoy-v3-20261031";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const NAV_CACHE = `${CACHE_VERSION}-nav`;

// Asset extensions we cache
const STATIC_EXTENSIONS = [
  ".js", ".mjs", ".css", ".woff", ".woff2", ".ttf", ".eot",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".avif",
];

// Domains/patterns that must NEVER be cached
function isExcluded(url) {
  const href = url.href;
  const pathname = url.pathname;
  // ── Vite dev server paths: never cache (causes stale React chunks) ──
  if (pathname.startsWith("/node_modules/.vite")) return true;
  if (pathname.startsWith("/@vite")) return true;
  if (pathname.startsWith("/@react-refresh")) return true;
  if (pathname.startsWith("/src/") && href.includes("?v=")) return true;
  // Backend function calls
  if (href.includes("/functions/")) return true;
  // Stripe (checkout, API, JS SDK)
  if (href.includes("stripe.com") || href.includes("js.stripe.com") || href.includes("api.stripe.com")) return true;
  // Base44 API endpoints (dynamic data)
  if (href.includes("base44.com/api/") || href.includes("/api/")) return true;
  // Travelpayouts / Hotellook / weather APIs
  if (href.includes("travelpayouts.com") || href.includes("hotellook.com") || href.includes("api.weather") || href.includes("ipapi.co")) return true;
  // BigDataCloud (reverse geocoding)
  if (href.includes("bigdatacloud.net")) return true;
  // Klook / Expedia / Hotels.com affiliate links
  if (href.includes("klook.") || href.includes("expedia.com") || href.includes("hotels.com")) return true;
  return false;
}

// Known CDN domains that serve static fonts/CSS (safe to cache for offline shell)
const STATIC_CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

function isStaticAsset(url) {
  if (isExcluded(url)) return false;
  // Same-origin static assets
  if (url.origin === self.location.origin) {
    return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
  }
  // Known font CDN static assets
  if (STATIC_CDN_HOSTS.includes(url.hostname)) {
    return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext)) || url.pathname.endsWith(".css");
  }
  return false;
}

// ── Install: pre-cache the app shell root ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add("/").catch(() => {})).then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches, claim clients ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== NAV_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route requests to the correct strategy ──
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET — POST/PUT/DELETE always go to network
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Never intercept excluded requests (functions, Stripe, APIs)
  if (isExcluded(url)) return;

  // Navigation requests (HTML pages) → network-first with cache fallback
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(request);
          const cache = await caches.open(NAV_CACHE);
          cache.put(request, networkRes.clone()).catch(() => {});
          return networkRes;
        } catch {
          // Network failed — try cache (offline support)
          const cached = await caches.match(request);
          if (cached) return cached;
          // Last resort: cached root
          const rootCache = await caches.match("/");
          if (rootCache) return rootCache;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // Static assets → stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => null);
        // Serve from cache immediately if available, fall back to network
        return cached || (await networkPromise) || new Response("", { status: 504 });
      })()
    );
    return;
  }

  // All other same-origin GETs (e.g. manifest.json, favicon) → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      })()
    );
  }
});
