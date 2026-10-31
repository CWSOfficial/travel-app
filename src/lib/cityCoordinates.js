// Deterministic city coordinate cache for the Journey Map.
// No API calls — uses a static map of major cities + localStorage cache.
// Reuses the same city list as geolocation.js (MAJOR_AIRPORT_CITIES).

const CACHE_PREFIX = "dheevoy_coords_";
const CACHE_VERSION = "v1";

// Static city → {lat, lng} map. Mirrors geolocation.js MAJOR_AIRPORT_CITIES
// plus additional common travel destinations.
const CITY_COORDS = {
  // Europe
  "london": { lat: 51.5074, lng: -0.1278 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "berlin": { lat: 52.5200, lng: 13.4050 },
  "rome": { lat: 41.9028, lng: 12.4964 },
  "madrid": { lat: 40.4168, lng: -3.7038 },
  "barcelona": { lat: 41.3851, lng: 2.1734 },
  "lisbon": { lat: 38.7223, lng: -9.1393 },
  "dublin": { lat: 53.3498, lng: -6.2603 },
  "frankfurt": { lat: 50.1109, lng: 8.6821 },
  "munich": { lat: 48.1351, lng: 11.5820 },
  "vienna": { lat: 48.2082, lng: 16.3738 },
  "prague": { lat: 50.0755, lng: 14.4378 },
  "athens": { lat: 37.9838, lng: 23.7275 },
  "istanbul": { lat: 41.0082, lng: 28.9784 },
  "stockholm": { lat: 59.3293, lng: 18.0686 },
  "copenhagen": { lat: 55.6761, lng: 12.5683 },
  "oslo": { lat: 59.9139, lng: 10.7522 },
  "helsinki": { lat: 60.1699, lng: 24.9384 },
  "brussels": { lat: 50.8503, lng: 4.3517 },
  "zurich": { lat: 47.3769, lng: 8.5417 },
  "geneva": { lat: 46.2044, lng: 6.1432 },
  "milan": { lat: 45.4642, lng: 9.1900 },
  "nice": { lat: 43.7102, lng: 7.2620 },
  "manchester": { lat: 53.4808, lng: -2.2426 },
  "edinburgh": { lat: 55.9533, lng: -3.1883 },
  "birmingham": { lat: 52.4862, lng: -1.8904 },
  "warsaw": { lat: 52.2297, lng: 21.0122 },
  "budapest": { lat: 47.4979, lng: 19.0402 },
  "bucharest": { lat: 44.4268, lng: 26.1025 },
  "venice": { lat: 45.4408, lng: 12.3155 },
  "florence": { lat: 43.7696, lng: 11.2558 },
  "naples": { lat: 40.8518, lng: 14.2681 },
  "porto": { lat: 41.1579, lng: -8.6291 },
  "seville": { lat: 37.3891, lng: -5.9845 },
  "hamburg": { lat: 53.5511, lng: 9.9937 },
  "cologne": { lat: 50.9375, lng: 6.9603 },
  "lyon": { lat: 45.7640, lng: 4.8357 },
  "marseille": { lat: 43.2965, lng: 5.3698 },
  // Middle East
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "abu dhabi": { lat: 24.4539, lng: 54.3773 },
  "doha": { lat: 25.2854, lng: 51.5310 },
  "tel aviv": { lat: 32.0853, lng: 34.7818 },
  "riyadh": { lat: 24.7136, lng: 46.6753 },
  "jeddah": { lat: 21.4858, lng: 39.1925 },
  "muscat": { lat: 23.5880, lng: 58.3829 },
  // Asia-Pacific
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "osaka": { lat: 34.6937, lng: 135.5023 },
  "kyoto": { lat: 35.0116, lng: 135.7681 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
  "hong kong": { lat: 22.3193, lng: 114.1694 },
  "bangkok": { lat: 13.7563, lng: 100.5018 },
  "kuala lumpur": { lat: 3.1390, lng: 101.6869 },
  "seoul": { lat: 37.5665, lng: 126.9780 },
  "shanghai": { lat: 31.2304, lng: 121.4737 },
  "beijing": { lat: 39.9042, lng: 116.4074 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "jakarta": { lat: -6.2088, lng: 106.8456 },
  "manila": { lat: 14.5995, lng: 120.9842 },
  "taipei": { lat: 25.0330, lng: 121.5654 },
  "ho chi minh city": { lat: 10.8231, lng: 106.6297 },
  "hanoi": { lat: 21.0285, lng: 105.8542 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "melbourne": { lat: -37.8136, lng: 144.9631 },
  "auckland": { lat: -36.8485, lng: 174.7633 },
  "perth": { lat: -31.9505, lng: 115.8605 },
  "bali": { lat: -8.3405, lng: 115.0920 },
  // Americas
  "new york": { lat: 40.7128, lng: -74.0060 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "miami": { lat: 25.7617, lng: -80.1918 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  "buenos aires": { lat: -34.6037, lng: -58.3816 },
  "sao paulo": { lat: -23.5505, lng: -46.6333 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  "boston": { lat: 42.3601, lng: -71.0589 },
  "washington": { lat: 38.9072, lng: -77.0369 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "las vegas": { lat: 36.1699, lng: -115.1398 },
  // Africa
  "johannesburg": { lat: -26.2041, lng: 28.0473 },
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "cairo": { lat: 30.0444, lng: 31.2357 },
  "nairobi": { lat: -1.2921, lng: 36.8219 },
  "casablanca": { lat: 33.5731, lng: -7.5898 },
  "marrakech": { lat: 31.6295, lng: -7.9811 },
};

const norm = (s) => String(s || "").toLowerCase().trim();

export const getCityCoords = (cityName) => {
  if (!cityName) return null;
  const key = norm(String(cityName).split(",")[0]);

  // 1. Check localStorage cache
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${CACHE_VERSION}_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.lat != null) return parsed;
    }
  } catch {}

  // 2. Check static map
  const coords = CITY_COORDS[key];
  if (coords) {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${CACHE_VERSION}_${key}`, JSON.stringify(coords));
    } catch {}
    return coords;
  }

  return null;
};

export const hasCityCoords = (cityName) => !!getCityCoords(cityName);

// ── Nominatim (OpenStreetMap) geocoding fallback ──
// Free, no API key, same provider as the map tiles.
// Usage policy: max 1 req/sec (we batch per-city on demand, well within limits).
async function geocodeCityNominatim(cityName) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=0`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // non-blocking — network error, CORS, etc.
  }
  return null;
}

// Full async resolution chain: localStorage cache → static map → Nominatim → save to cache.
// If all lookups fail, logs a non-blocking warning and returns null (pin omitted, no crash).
export async function resolveCityCoords(cityName) {
  if (!cityName) return null;

  // 1+2. Fast path: sync cache + static map (delegates to getCityCoords)
  const syncCoords = getCityCoords(cityName);
  if (syncCoords) return syncCoords;

  // 3. Nominatim geocoding fallback — pass full "City, Country" for accuracy
  const cacheKey = norm(String(cityName).split(",")[0]);
  const geocoded = await geocodeCityNominatim(norm(cityName));
  if (geocoded) {
    // 4. Save successful result back into localStorage cache
    try {
      localStorage.setItem(`${CACHE_PREFIX}${CACHE_VERSION}_${cacheKey}`, JSON.stringify(geocoded));
    } catch {}
    return geocoded;
  }

  // Lookup failed — non-blocking warning, return null (pin omitted)
  console.warn(`[JourneyMap] Could not resolve coordinates for "${cityName}" — pin omitted.`);
  return null;
}