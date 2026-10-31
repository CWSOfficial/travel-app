// Global destination search coordinator — merges local static results with
// Mapbox geocoding results from the searchDestinationsGlobal backend function.
//
// Resolution order:
//   1. Local static list (searchDestinations from destinationData.js) — instant
//   2. localStorage query cache (previous Mapbox results) — instant
//   3. Mapbox geocoding via backend function — async, debounced by caller
//   4. Successful Mapbox results cached back to localStorage

import { searchDestinations, COUNTRIES } from "@/lib/destinationData";
import { base44 } from "@/api/base44Client";

const QUERY_CACHE_PREFIX = "dheevoy_destq_";
const QUERY_CACHE_VERSION = "v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// ── localStorage query cache ──
function getCachedQuery(query) {
  try {
    const key = `${QUERY_CACHE_PREFIX}${QUERY_CACHE_VERSION}_${query.toLowerCase().trim()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - (parsed.cachedAt || 0) > CACHE_TTL_MS) return null;
    return parsed.results;
  } catch {
    return null;
  }
}

function setCachedQuery(query, results) {
  try {
    const key = `${QUERY_CACHE_PREFIX}${QUERY_CACHE_VERSION}_${query.toLowerCase().trim()}`;
    localStorage.setItem(key, JSON.stringify({ results, cachedAt: Date.now() }));
  } catch {
    // non-blocking
  }
}

// ── Normalize local static results to structured format ──
function normalizeLocalResult(label) {
  const parts = label.split(",").map((p) => p.trim());
  const city = parts[0] || "";
  const country = parts.slice(1).join(", ") || "";
  return {
    label,
    city,
    country,
    country_code: "",
    lat: null,
    lng: null,
    place_id: null,
    type: country && !city ? "country" : "place",
    source: "local",
  };
}

// ── Country-only search from the ISO COUNTRIES list ──
function searchLocalCountries(query) {
  const q = query.toLowerCase();
  return COUNTRIES
    .filter((c) => c.toLowerCase().includes(q))
    .slice(0, 3)
    .map((c) => ({
      label: c,
      city: "",
      country: c,
      country_code: "",
      lat: null,
      lng: null,
      place_id: null,
      type: "country",
      source: "local",
    }));
}

// ── Instant local search (synchronous — for immediate display) ──
// Uses strict prefix/contains matching only (no fuzzy) so irrelevant results
// don't crowd out Mapbox results. Mapbox handles broader "did you mean?" cases.
export function searchLocalInstant(query, countriesOnly = false) {
  const q = query.trim();
  if (q.length < 2) return [];
  if (countriesOnly) return searchLocalCountries(q);

  const localLabels = searchDestinations(q, false);
  // Filter out fuzzy-only matches — keep only results that actually contain
  // the query as a substring so Mapbox results surface for non-static places.
  const qLower = q.toLowerCase();
  const filtered = localLabels.filter((label) => label.toLowerCase().includes(qLower));
  let results = filtered.map(normalizeLocalResult);
  // Also add country matches if not already present (e.g. "Albania" as a country)
  const existingLabels = new Set(results.map((r) => r.label.toLowerCase()));
  const countryMatches = searchLocalCountries(q).filter(
    (c) => !existingLabels.has(c.label.toLowerCase())
  );
  results = [...results, ...countryMatches];
  return results.slice(0, 8);
}

// ── Full global search (async — local + Mapbox merged) ──
// Called after debounce (350ms) from LocationAutocomplete.
export async function searchGlobalDestinations(query, countriesOnly = false) {
  const q = query.trim();
  if (q.length < 2) return [];

  // 1. Local results (instant — same as searchLocalInstant)
  let results = searchLocalInstant(q, countriesOnly);

  // 2. Remote Mapbox search (only for queries >= 3 chars)
  if (q.length >= 3) {
    // Check query cache first to avoid repeated backend calls
    let mapboxResults = getCachedQuery(q);
    if (!mapboxResults) {
      try {
        const res = await base44.functions.invoke("searchDestinationsGlobal", { query: q });
        mapboxResults = res.data?.results || [];
        if (mapboxResults.length) setCachedQuery(q, mapboxResults);
      } catch {
        mapboxResults = [];
      }
    }

    // 3. Merge — dedupe by label (case-insensitive), local results take priority
    const seen = new Set(results.map((r) => r.label.toLowerCase()));
    for (const mb of mapboxResults) {
      const key = mb.label.toLowerCase();
      if (!seen.has(key)) {
        results.push(mb);
        seen.add(key);
      }
    }
  }

  return results.slice(0, 8);
}