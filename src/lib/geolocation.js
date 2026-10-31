// Detects the user's likely DEPARTURE city using browser geolocation (preferred)
// with IP-based geolocation as a fallback when permission is denied.
//
// CRITICAL: We resolve to the nearest MAJOR city with airport service, not the
// precise suburb/town. This prevents "could not resolve city to airport code"
// failures downstream in flight search (e.g. "Sutton" → should be "London").

// Major cities with airport service + approximate coordinates.
// Mirrors the MAJOR_CITY_IATA table in searchFlightsHotels/entry.ts — these are
// the same cities the backend can resolve to IATA codes without an API call.
const MAJOR_AIRPORT_CITIES = [
  // Europe
  { city: "London", lat: 51.5074, lng: -0.1278 },
  { city: "Paris", lat: 48.8566, lng: 2.3522 },
  { city: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { city: "Berlin", lat: 52.5200, lng: 13.4050 },
  { city: "Rome", lat: 41.9028, lng: 12.4964 },
  { city: "Madrid", lat: 40.4168, lng: -3.7038 },
  { city: "Barcelona", lat: 41.3851, lng: 2.1734 },
  { city: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { city: "Dublin", lat: 53.3498, lng: -6.2603 },
  { city: "Frankfurt", lat: 50.1109, lng: 8.6821 },
  { city: "Munich", lat: 48.1351, lng: 11.5820 },
  { city: "Vienna", lat: 48.2082, lng: 16.3738 },
  { city: "Prague", lat: 50.0755, lng: 14.4378 },
  { city: "Athens", lat: 37.9838, lng: 23.7275 },
  { city: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { city: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { city: "Copenhagen", lat: 55.6761, lng: 12.5683 },
  { city: "Oslo", lat: 59.9139, lng: 10.7522 },
  { city: "Helsinki", lat: 60.1699, lng: 24.9384 },
  { city: "Brussels", lat: 50.8503, lng: 4.3517 },
  { city: "Zurich", lat: 47.3769, lng: 8.5417 },
  { city: "Geneva", lat: 46.2044, lng: 6.1432 },
  { city: "Milan", lat: 45.4642, lng: 9.1900 },
  { city: "Nice", lat: 43.7102, lng: 7.2620 },
  { city: "Manchester", lat: 53.4808, lng: -2.2426 },
  { city: "Edinburgh", lat: 55.9533, lng: -3.1883 },
  { city: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { city: "Warsaw", lat: 52.2297, lng: 21.0122 },
  { city: "Budapest", lat: 47.4979, lng: 19.0402 },
  { city: "Bucharest", lat: 44.4268, lng: 26.1025 },
  // Middle East
  { city: "Dubai", lat: 25.2048, lng: 55.2708 },
  { city: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { city: "Doha", lat: 25.2854, lng: 51.5310 },
  { city: "Tel Aviv", lat: 32.0853, lng: 34.7818 },
  { city: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { city: "Jeddah", lat: 21.4858, lng: 39.1925 },
  { city: "Muscat", lat: 23.5880, lng: 58.3829 },
  // Asia-Pacific
  { city: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { city: "Osaka", lat: 34.6937, lng: 135.5023 },
  { city: "Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { city: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { city: "Kuala Lumpur", lat: 3.1390, lng: 101.6869 },
  { city: "Seoul", lat: 37.5665, lng: 126.9780 },
  { city: "Shanghai", lat: 31.2304, lng: 121.4737 },
  { city: "Beijing", lat: 39.9042, lng: 116.4074 },
  { city: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { city: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { city: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { city: "Manila", lat: 14.5995, lng: 120.9842 },
  { city: "Taipei", lat: 25.0330, lng: 121.5654 },
  { city: "Ho Chi Minh City", lat: 10.8231, lng: 106.6297 },
  { city: "Hanoi", lat: 21.0285, lng: 105.8542 },
  { city: "Sydney", lat: -33.8688, lng: 151.2093 },
  { city: "Melbourne", lat: -37.8136, lng: 144.9631 },
  { city: "Auckland", lat: -36.8485, lng: 174.7633 },
  { city: "Perth", lat: -31.9505, lng: 115.8605 },
  // Americas
  { city: "New York", lat: 40.7128, lng: -74.0060 },
  { city: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { city: "Chicago", lat: 41.8781, lng: -87.6298 },
  { city: "Miami", lat: 25.7617, lng: -80.1918 },
  { city: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { city: "Toronto", lat: 43.6532, lng: -79.3832 },
  { city: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { city: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { city: "Sao Paulo", lat: -23.5505, lng: -46.6333 },
  { city: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 },
  { city: "Boston", lat: 42.3601, lng: -71.0589 },
  { city: "Washington", lat: 38.9072, lng: -77.0369 },
  { city: "Seattle", lat: 47.6062, lng: -122.3321 },
  { city: "Las Vegas", lat: 36.1699, lng: -115.1398 },
  // Africa
  { city: "Johannesburg", lat: -26.2041, lng: 28.0473 },
  { city: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { city: "Cairo", lat: 30.0444, lng: 31.2357 },
  { city: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { city: "Casablanca", lat: 33.5731, lng: -7.5898 },
];

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the nearest major airport city to given coordinates
function nearestMajorCity(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  for (const c of MAJOR_AIRPORT_CITIES) {
    const dist = haversineKm(lat, lng, c.lat, c.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = c.city;
    }
  }
  return nearest;
}

export async function detectUserCity() {
  // 1. Try browser geolocation — but only if permission is ALREADY granted.
  //    This avoids forcing a permission prompt on Nearby tab load. If the user
  //    hasn't granted (or hasn't been asked), skip to IP-based detection.
  if (navigator.geolocation) {
    try {
      let hasPermission = true;
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: "geolocation" }).catch(() => null);
        // Only proceed if explicitly granted; 'prompt' or 'denied' → skip GPS
        hasPermission = perm?.state === "granted";
      }
      if (hasPermission) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false,
          });
        });
        const { latitude, longitude } = position.coords;
        const city = nearestMajorCity(latitude, longitude);
        if (city) return city;
      }
    } catch (_) {
      // Geolocation denied, timed out — fall through to IP
    }
  }

  // 2. Fallback: IP-based location — ipapi.co returns latitude/longitude
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    // Use coordinates to find nearest major city (more reliable than data.city)
    if (data.latitude && data.longitude) {
      const city = nearestMajorCity(data.latitude, data.longitude);
      if (city) return city;
    }
    // Last resort: use the IP geolocation city name directly
    if (data.city) return data.city;
  } catch (_) {
    // IP geolocation also failed
  }

  return null;
}