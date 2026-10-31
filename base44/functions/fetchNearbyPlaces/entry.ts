import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { secrets } from "base44:runtime";
import { checkRateLimit, checkTokenRateLimit, getClientIp } from "../../shared/rateLimiter.ts";
import { verifySessionToken, SECRET_KEY } from "../../shared/sessionToken.ts";

// Text-only Google Places API (New) Text Search proxy with geocoded
// location bias + curated graceful fallback.
//
// QUERY LOGIC:
//   The destination string (trip.destination or searched city) is the anchor —
//   never the caller's GPS. We geocode it to lat/lng (Google Geocoding API) and
//   pass a 15km-radius locationBias to the Places text search so results are
//   scoped to the real destination, regardless of where the user physically is.
//
// SECURITY: Four-layer gate before the Google API is called:
//   1. createClientFromRequest — validates the Base44 platform auth token
//      that the SDK injects. Blocks direct curl / external calls that lack
//      a valid app session.
//   2. Session-token verification — a server-signed HMAC token (issued by
//      issueSessionToken, public/no-login) proves the caller is a real browser
//      session and yields a stable, unforgeable identity (the nonce) for
//      per-user rate limiting. Same architecture as generateAiContent /
//      searchDestinationsGlobal.
//   3. Per-token (primary) + per-IP (secondary) rate limiting — DB-backed
//      (RateLimitBucket) so caps hold across all function instances.
//   4. Input validation — destination length + category allowlist, guards
//      against injection / unexpected payloads.
// The Google Places API key itself is server-side only (secrets.get) and is
// never exposed to the client bundle.

const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP (secondary bound)
const TOKEN_RATE_LIMIT_MAX = 60; // 60 requests per minute per verified token identity (primary bound)
const PLACES_TIMEOUT_MS = 8000; // abort the Places call after 8s → fallback
const RADIUS_METERS = 15000; // 15km radius around geocoded destination

// ── Curated fallback places — returned when Google Places fails, times out,
//    returns a 4xx/5xx, or yields no results, so the UI always renders rich
//    interactive cards. Each card links to a scoped Google Maps search for the
//    destination — honest discovery links, never fabricated ratings/addresses.
function buildFallbackPlaces(destination: string, category: string) {
  const maps = (label: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} in ${destination}`)}`;
  const presets: Record<string, { name: string; tag: string }[]> = {
    things_to_do: [
      { name: "Top Attractions", tag: "Attractions" },
      { name: "Guided Tours", tag: "Tours" },
      { name: "Outdoor Activities", tag: "Outdoor" },
      { name: "Museums & Culture", tag: "Culture" },
    ],
    places: [
      { name: "Landmarks", tag: "Landmarks" },
      { name: "Parks & Gardens", tag: "Parks" },
      { name: "Viewpoints", tag: "Viewpoints" },
      { name: "Historic Sites", tag: "Historic" },
    ],
    food: [
      { name: "Top Restaurants", tag: "Dining" },
      { name: "Cafés & Coffee", tag: "Cafés" },
      { name: "Local Cuisine", tag: "Local" },
      { name: "Street Food", tag: "Street Food" },
    ],
    lodging: [
      { name: "Hotels", tag: "Hotels" },
      { name: "Boutique Stays", tag: "Boutique" },
      { name: "Budget Stays", tag: "Budget" },
      { name: "Resorts", tag: "Resorts" },
    ],
  };
  const list = presets[category] || presets.places;
  return list.map((p) => ({
    name: `${p.name} in ${destination}`,
    rating: null,
    reviewCount: null,
    categoryTag: p.tag,
    address: null,
    photoUrl: null,
    mapsUrl: maps(p.name),
    fallback: true,
  }));
}

// ── Geocode the destination string to lat/lng via Google Geocoding API.
//    Returns null on any failure — the caller proceeds without locationBias
//    (text search still works on the destination name alone).
async function geocodeDestination(apiKey: string, destination: string) {
  try {
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${apiKey}`;
    const geoRes = await fetch(geoUrl, { method: "GET" });
    // ── Unmasked diagnostic: log HTTP status + full Google response body on
    //    any non-success, so REQUEST_DENIED / OVER_QUERY_LIMIT / key
    //    restriction errors are visible in function logs. ──
    const geoStatus = geoRes.status;
    const geoBodyText = await geoRes.text();
    if (!geoRes.ok) {
      console.error(`fetchNearbyPlaces: Geocoding API HTTP ${geoStatus} for "${destination}" — body: ${geoBodyText}`);
      return null;
    }
    let geoData: any;
    try { geoData = JSON.parse(geoBodyText); } catch { 
      console.error(`fetchNearbyPlaces: Geocoding API returned non-JSON for "${destination}" — body: ${geoBodyText}`);
      return null;
    }
    // Google returns 200 even for REQUEST_DENIED etc. — inspect status field.
    if (geoData?.status && geoData.status !== "OK") {
      console.error(`fetchNearbyPlaces: Geocoding API status="${geoData.status}" error_message="${geoData.error_message || ""}" for "${destination}"`);
      return null;
    }
    const loc = geoData?.results?.[0]?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) {
      return { latitude: loc.lat, longitude: loc.lng };
    }
    console.error(`fetchNearbyPlaces: Geocoding API returned no results for "${destination}" — status="${geoData?.status}"`);
    return null;
  } catch (e) {
    console.error("fetchNearbyPlaces: geocoding fetch threw:", e.message || e);
    return null;
  }
}

export default async function (req: Request): Promise<Response> {
  // Hoisted so the outer catch can still return a fallback if something fails
  // after parsing but before the Google call.
  let destination = "";
  let category = "places";

  try {
    // ── Layer 1: Verify the request came through the Base44 platform ──
    let base44;
    try {
      base44 = createClientFromRequest(req);
    } catch (e) {
      console.error("fetchNearbyPlaces: createClientFromRequest threw:", e.message || e);
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body early — needed for session-token verification.
    const body = await req.json().catch(() => ({}));

    // ── Layer 2: Session-token verification (verified per-browser identity) ──
    // Same architecture as generateAiContent / searchDestinationsGlobal: the
    // client obtains a server-signed token from issueSessionToken (public, no
    // login required) and the wrapper in base44Client.js attaches it to every
    // call. A valid token proves the caller is a real browser session and
    // yields a stable identity (the nonce) for per-user rate limiting. An
    // invalid/missing token is a hard reject — the wrapper always attaches one,
    // so a missing token means a direct/abusive caller bypassing the wrapper.
    const secret = secrets.get(SECRET_KEY);
    if (!secret) {
      console.error("fetchNearbyPlaces: SESSION_TOKEN_SECRET not configured");
      return Response.json({ places: buildFallbackPlaces(destination, category), category, destination, fallback: true });
    }
    const identity = await verifySessionToken(secret, body?._session_token);
    if (!identity.valid) {
      return Response.json({ error: "Invalid or missing session token" }, { status: 401 });
    }

    // ── Layer 3: Per-token rate limiting (primary, verified identity) ──
    if (!(await checkTokenRateLimit(base44, "fetchNearbyPlaces", identity.nonce, 60_000, TOKEN_RATE_LIMIT_MAX))) {
      return Response.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    // ── Auth: identify the caller but DO NOT reject guests ──
    // The Nearby page is public (no login required), so guest callers must
    // be able to reach the Google Places data. The session-token check above
    // and the per-IP rate limit below cap quota abuse. The Google API key
    // stays server-side either way.
    const user = await base44.auth.me().catch((e) => {
      console.error("fetchNearbyPlaces: auth.me() threw (treating as guest):", e?.message || e);
      return null;
    });
    console.log(`fetchNearbyPlaces: caller ${user ? `authenticated (id=${user.id})` : 'GUEST'}`);

    // ── Layer 4: Per-IP rate limiting (secondary bound) ──
    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(base44, "fetchNearbyPlaces", clientIp, 60_000, RATE_LIMIT_MAX_REQUESTS))) {
      return Response.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    // ── Layer 5: Input validation ──
    destination = (body.destination || "").trim();
    const validCategories = ["food", "places", "things_to_do", "lodging"];
    category = validCategories.includes(body.category) ? body.category : "places";

    if (!destination || destination.length > 200) {
      return Response.json(
        { error: "Valid destination (max 200 chars) is required" },
        { status: 400 }
      );
    }

    // ── Google API key (server-side only) ──
    const apiKey = secrets.get("Google_API_Key");
    if (!apiKey) {
      console.error("fetchNearbyPlaces: Google_API_Key secret not set — returning fallback");
      return Response.json({ places: buildFallbackPlaces(destination, category), category, destination, fallback: true });
    }

    console.log(`fetchNearbyPlaces: category="${category}" destination="${destination}" ip="${clientIp}"`);

    // ── Geocode the destination → anchor the search to real coordinates ──
    const coords = await geocodeDestination(apiKey, destination);
    if (coords) {
      console.log(`fetchNearbyPlaces: geocoded "${destination}" → ${coords.latitude},${coords.longitude} (15km bias)`);
    } else {
      console.log(`fetchNearbyPlaces: no geocode result — relying on text query only`);
    }

    const textQuery =
      category === "food"
        ? `restaurants in ${destination}`
        : category === "things_to_do"
        ? `things to do in ${destination}`
        : category === "lodging"
        ? `hotels in ${destination}`
        : `tourist attractions in ${destination}`;

    // Unified field mask — required header for the Places API (New).
    // Includes the requested fields plus the UI-dependent ones so nothing
    // the cards render goes missing.
    const fieldMask =
      "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.primaryType,places.primaryTypeDisplayName";

    const searchBody: Record<string, unknown> = {
      textQuery,
      languageCode: "en",
      maxResultCount: 20,
    };
    if (coords) {
      searchBody.locationBias = {
        circle: {
          center: coords,
          radius: RADIUS_METERS,
        },
      };
    }

    // ── Timeout-protected Places request — fall back on any failure ──
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
    let response;
    try {
      response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(searchBody),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      console.error("fetchNearbyPlaces: Places request failed/aborted:", e.message || e);
      return Response.json({ places: buildFallbackPlaces(destination, category), category, destination, fallback: true });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("fetchNearbyPlaces: Google Places API error:", response.status, errText);
      return Response.json({ places: buildFallbackPlaces(destination, category), category, destination, fallback: true });
    }

    const data = await response.json();
    const rawPlaces = data.places || [];

    if (rawPlaces.length === 0) {
      console.log("fetchNearbyPlaces: no results — returning curated fallback");
      return Response.json({ places: buildFallbackPlaces(destination, category), category, destination, fallback: true });
    }

    // Map places — for lodging, fetch first photo URL per place (server-side
    // to keep API key private). skipHttpRedirect=true returns the CDN URL.
    const places = await Promise.all(
      rawPlaces.map(async (p) => {
        const mapped = {
          name: p.displayName?.text || "Unknown",
          rating: p.rating ?? null,
          reviewCount: p.userRatingCount ?? null,
          categoryTag: p.primaryTypeDisplayName?.text || p.primaryType || null,
          address: p.formattedAddress || null,
          photoUrl: null,
        };

        if (category === "lodging" && p.photos?.[0]?.name) {
          try {
            const photoRes = await fetch(
              `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&skipHttpRedirect=true&key=${apiKey}`,
              { method: "GET" }
            );
            if (photoRes.ok) {
              const photoData = await photoRes.json();
              mapped.photoUrl = photoData.photoUri || null;
            }
          } catch (e) {
            console.error("Photo fetch error:", e.message);
          }
        }

        return mapped;
      })
    );

    return Response.json({ places, category, destination, fallback: false });
  } catch (error) {
    console.error("fetchNearbyPlaces error:", error.message || error);
    // Last-resort graceful fallback — never surface a raw error to the UI.
    if (destination) {
      return Response.json({ places: buildFallbackPlaces(destination, category), category, destination, fallback: true });
    }
    return Response.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}