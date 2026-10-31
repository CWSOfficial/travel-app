// Client-side persistent image cache for destination + activity images.
// Uses localStorage so reopening a saved journey doesn't trigger repeat
// external lookups for the same destination+keyword combination.
//
// Lookup order (per destinationImages.js):
//   1. Activity keyword match (static ACTIVITY_IMAGES map)
//   2. Cache hit for destination + activity keyword
//   3. Cache hit for destination generic ("any")
//   4. New resolution via the static city/activity maps
//   5. Fallback gradient image
//
// A companion DestinationImageCache entity exists for future server-side
// cross-user persistence. On this branch, entity records can't be written,
// so localStorage provides immediate persistence without backend writes.

const CACHE_PREFIX = "dheevoy_img_";
const CACHE_VERSION = "v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30-day TTL

const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, "_");
const cacheKey = (city, keyword) => `${CACHE_PREFIX}${CACHE_VERSION}_${norm(city) || "any"}_${norm(keyword) || "any"}`;

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.url) return null;
    if (Date.now() - (parsed.validated_at || 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const write = (key, url, source) => {
  try {
    localStorage.setItem(key, JSON.stringify({ url, source, validated_at: Date.now() }));
  } catch {
    /* quota exceeded — ignore, cache is best-effort */
  }
};

// Public API ──────────────────────────────────────────────────────────

export const getCachedImage = (city, keyword) => {
  const entry = read(cacheKey(city, keyword));
  return entry?.url || null;
};

export const getCachedCityImage = (city) => getCachedImage(city, "any");

export const cacheImage = (url, city, keyword, source = "unsplash") => {
  if (!url) return;
  write(cacheKey(city, keyword), url, source);
};

// Warm the cache from static maps on module load so known city/keyword
// combos are pre-cached without any runtime lookup cost.
export const warmCacheFromMaps = (cityImageMap, activityImageMap) => {
  try {
    Object.entries(cityImageMap || {}).forEach(([city, imgs]) => {
      if (Array.isArray(imgs) && imgs[0]) cacheImage(imgs[0], city, "any", "static_map");
    });
    Object.entries(activityImageMap || {}).forEach(([kw, url]) => {
      if (url) cacheImage(url, "any", kw, "static_map");
    });
  } catch {
    /* ignore */
  }
};