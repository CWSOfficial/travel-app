import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { secrets } from "base44:runtime";
import { checkRateLimit, checkTokenRateLimit, getClientIp } from "../../shared/rateLimiter.ts";
import { verifySessionToken, SECRET_KEY } from "../../shared/sessionToken.ts";

// Mapbox Geocoding API v5 proxy for global destination autocomplete.
// Returns travel-relevant results (countries, regions, cities, localities,
// districts) with structured data: label, city, country, country_code,
// lat, lng, place_id, type.
//
// No auth required — this is a public app and guests need to search
// destinations. The platform token (createClientFromRequest) still validates
// the request origin, and per-IP rate limiting (30 req/min) prevents quota
// abuse. The Mapbox token is server-side only (secrets.get), never exposed.

const RATE_LIMIT_MAX = 30; // 30 autocomplete searches per minute per IP (secondary bound)
const TOKEN_RATE_LIMIT_MAX = 60; // 60 searches per minute per verified token identity (primary bound)
const MAPBOX_TYPES = "country,region,district,place,locality,neighborhood";

function normalizeFeature(feature: any) {
  if (!feature) return null;
  const context = feature.context || [];
  const countryCtx = context.find((c: any) => (c.id || "").startsWith("country"));
  const isCountry = (feature.place_type || []).includes("country");
  const placeName = feature.text || "";
  const countryName = isCountry ? placeName : (countryCtx?.text || "");
  const countryCode = (countryCtx?.short_code || "")
    .toUpperCase()
    .replace(/^([A-Z]{2})-.+$/, "$1");
  const fullName =
    feature.place_name ||
    (countryName && !isCountry ? `${placeName}, ${countryName}` : placeName);
  return {
    label: fullName,
    city: isCountry ? "" : placeName,
    country: countryName,
    country_code: countryCode,
    lat: feature.center ? feature.center[1] : null,
    lng: feature.center ? feature.center[0] : null,
    place_id: feature.id || null,
    type: (feature.place_type || [])[0] || "place",
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // ── Session-token verification (verified per-browser identity) ──
    // The client attaches a server-signed token from issueSessionToken. Its
    // nonce becomes the primary rate-limit key — a stable, unforgeable
    // identity that an abusive caller cannot rotate by switching IPs.
    const secret = secrets.get(SECRET_KEY);
    if (!secret) {
      console.error("searchDestinationsGlobal: SESSION_TOKEN_SECRET not configured");
      return Response.json({ results: [] }, { status: 500 });
    }
    const identity = await verifySessionToken(secret, body?._session_token);
    if (!identity.valid) {
      return Response.json({ error: "Invalid or missing session token", results: [] }, { status: 401 });
    }

    // ── Per-token rate limit (primary) then per-IP rate limit (secondary) ──
    const tokenOk = await checkTokenRateLimit(
      base44,
      "searchDestinationsGlobal",
      identity.nonce,
      60_000,
      TOKEN_RATE_LIMIT_MAX,
    );
    if (!tokenOk) {
      return Response.json(
        { error: "Too many searches. Please slow down.", results: [] },
        { status: 429 },
      );
    }
    const clientIp = getClientIp(req);
    const ipOk = await checkRateLimit(
      base44,
      "searchDestinationsGlobal",
      clientIp,
      60_000,
      RATE_LIMIT_MAX,
    );
    if (!ipOk) {
      return Response.json(
        { error: "Too many searches. Please slow down.", results: [] },
        { status: 429 },
      );
    }

    const query = (body?.query || "").trim();
    if (query.length < 2) return Response.json({ results: [] });
    if (query.length > 100)
      return Response.json({ error: "Query too long", results: [] }, { status: 400 });

    const token = secrets.get("MAPBOX_ACCESS_TOKEN");
    if (!token) return Response.json({ results: [], mapboxUnavailable: true });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=${MAPBOX_TYPES}&limit=8&language=en`;
    const mapboxRes = await fetch(url);
    if (!mapboxRes.ok) return Response.json({ results: [], mapboxUnavailable: true });
    const data = await mapboxRes.json();
    const results = (data.features || []).map(normalizeFeature).filter(Boolean);
    return Response.json({ results });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "internal_error", results: [] },
      { status: 500 },
    );
  }
}