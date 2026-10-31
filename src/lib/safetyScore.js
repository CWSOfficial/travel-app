import { base44 } from "@/api/base44Client";
import { cleanCountryName } from "@/lib/flagEmoji";

// Common tourist city → country mapping. The DestinationSafetyCache stores
// country-level scores, so a city query is resolved to its country to surface
// the real country-level score (never a fabricated city-specific number).
const CITY_TO_COUNTRY = {
  tokyo: "Japan", osaka: "Japan", kyoto: "Japan", sapporo: "Japan",
  cairo: "Egypt", luxor: "Egypt", aswan: "Egypt", giza: "Egypt",
  paris: "France", nice: "France", lyon: "France",
  london: "United Kingdom", manchester: "United Kingdom", edinburgh: "United Kingdom",
  "new york": "United States", "new york city": "United States", "los angeles": "United States",
  "san francisco": "United States", miami: "United States", "las vegas": "United States",
  rome: "Italy", milan: "Italy", venice: "Italy", florence: "Italy",
  madrid: "Spain", barcelona: "Spain", seville: "Spain",
  bangkok: "Thailand", phuket: "Thailand", "chiang mai": "Thailand",
  bali: "Indonesia", jakarta: "Indonesia",
  sydney: "Australia", melbourne: "Australia",
  mumbai: "India", delhi: "India", "new delhi": "India", goa: "India",
  "rio de janeiro": "Brazil", "sao paulo": "Brazil",
  "cape town": "South Africa", johannesburg: "South Africa",
  istanbul: "Turkey",
  dubai: "United Arab Emirates",
  berlin: "Germany", munich: "Germany",
  amsterdam: "Netherlands",
  lisbon: "Portugal", porto: "Portugal",
  athens: "Greece",
  seoul: "South Korea",
  beijing: "China", shanghai: "China",
  "mexico city": "Mexico", cancun: "Mexico",
  toronto: "Canada", vancouver: "Canada",
  marrakech: "Morocco", casablanca: "Morocco",
  nairobi: "Kenya",
  lagos: "Nigeria",
};

const norm = (s) => (s || "").toLowerCase().trim();

// Resolve the real safety score for a free-text destination from the
// DestinationSafetyCache entity (the same source powering the homepage
// Trending cards). Returns:
//   { found: false }
//   { found: true, countryName, countryCode, score, isCountryLevelOnly, visaStatus, advisoryText }
export async function resolveSafetyScore(destination) {
  let rows = [];
  try {
    rows = await base44.entities.DestinationSafetyCache.list("-last_updated", 200);
  } catch {
    return { found: false };
  }
  const dest = norm(destination);
  if (!dest) return { found: false };

  // 1. Exact country-name match (after stripping "... travel advice" suffixes).
  let row = rows.find((r) => norm(cleanCountryName(r.country_name)) === dest);

  // 2. City → country resolution, then match that country.
  if (!row) {
    const country = CITY_TO_COUNTRY[dest];
    if (country) row = rows.find((r) => norm(cleanCountryName(r.country_name)) === norm(country));
  }

  // 3. Loose contains match (destination contains country name or vice versa).
  if (!row) {
    row = rows.find((r) => {
      const c = norm(cleanCountryName(r.country_name));
      return c && c.length >= 3 && (dest.includes(c) || c.includes(dest));
    });
  }

  if (!row) return { found: false };

  const score = typeof row.safety_index_score === "number" ? row.safety_index_score : null;
  const countryName = cleanCountryName(row.country_name) || row.country_name;
  const isCountryLevelOnly = norm(countryName) !== dest;
  return {
    found: true,
    countryName,
    countryCode: row.country_code,
    score,
    isCountryLevelOnly,
    visaStatus: row.visa_status,
    advisoryText: row.critical_advisories_text,
  };
}