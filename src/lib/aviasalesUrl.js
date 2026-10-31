/**
 * Shared Aviasales URL builder — the SINGLE source of truth for frontend Aviasales links.
 * Mirrors the backend's resolveIata + fmtAviasalesDate logic in searchFlightsHotels/entry.ts.
 *
 * If city→IATA can't be resolved locally, falls back to the Travelpayouts short link
 * so the user always lands on a working search page.
 */

// Same major-city → IATA table as the backend (searchFlightsHotels/entry.ts MAJOR_CITY_IATA).
// Kept in sync — if you add a city here, add it there too.
const MAJOR_CITY_IATA = {
  'london': 'LON', 'paris': 'PAR', 'amsterdam': 'AMS', 'berlin': 'BER',
  'rome': 'ROM', 'madrid': 'MAD', 'barcelona': 'BCN', 'lisbon': 'LIS',
  'dublin': 'DUB', 'frankfurt': 'FRA', 'munich': 'MUC', 'vienna': 'VIE',
  'prague': 'PRG', 'athens': 'ATH', 'istanbul': 'IST', 'stockholm': 'STO',
  'copenhagen': 'CPH', 'oslo': 'OSL', 'helsinki': 'HEL', 'brussels': 'BRU',
  'zurich': 'ZRH', 'geneva': 'GVA', 'milan': 'MIL', 'nice': 'NCE',
  'manchester': 'MAN', 'edinburgh': 'EDI', 'birmingham': 'BHX',
  'warsaw': 'WAW', 'budapest': 'BUD', 'bucharest': 'BUH',
  'dubai': 'DXB', 'abu dhabi': 'AUH', 'doha': 'DOH', 'tel aviv': 'TLV',
  'riyadh': 'RUH', 'jeddah': 'JED', 'muscat': 'MCT',
  'tokyo': 'TYO', 'osaka': 'OSA', 'singapore': 'SIN', 'hong kong': 'HKG',
  'bangkok': 'BKK', 'kuala lumpur': 'KUL', 'seoul': 'SEL', 'shanghai': 'SHA',
  'beijing': 'BJS', 'delhi': 'DEL', 'mumbai': 'BOM', 'bangalore': 'BLR',
  'jakarta': 'JKT', 'manila': 'MNL', 'taipei': 'TPE', 'ho chi minh city': 'SGN',
  'hanoi': 'HAN', 'sydney': 'SYD', 'melbourne': 'MEL', 'auckland': 'AKL',
  'perth': 'PER', 'bali': 'DPS', 'denpasar': 'DPS', 'phuket': 'HKT',
  'new york': 'NYC', 'los angeles': 'LAX', 'chicago': 'CHI', 'miami': 'MIA',
  'san francisco': 'SFO', 'toronto': 'YTO', 'mexico city': 'MEX',
  'buenos aires': 'BUE', 'sao paulo': 'SAO', 'rio de janeiro': 'RIO',
  'boston': 'BOS', 'washington': 'WAS', 'seattle': 'SEA', 'las vegas': 'LAS',
  'johannesburg': 'JNB', 'cape town': 'CPT', 'cairo': 'CAI',
  'nairobi': 'NBO', 'casablanca': 'CMN',
  'antalya': 'AYT', 'bodrum': 'BJV', 'tenerife': 'TFS', 'las palmas': 'LPA',
  'malaga': 'AGP', 'alicante': 'ALC', 'sharm el sheikh': 'SSH', 'hurghada': 'HRG',
  'marrakech': 'RAK', 'tunis': 'TUN',
};

// Travelpayouts public affiliate marker — a public attribution identifier that
// must appear in outbound traveller-facing URLs for Aviasales to attribute
// commission. This is NOT the private TRAVELPAYOUTS_API_TOKEN (which stays
// server-side in Base44 Secrets and is never exposed to the client bundle).
const AFFILIATE_MARKER = '738679';

// Fallback short link when IATA can't be resolved locally
const AVIASALES_FALLBACK_LINK = 'https://aviasales.tpo.lu/I38YowLq';

/**
 * Extract the city name from a location string that may include country/state.
 * "London, United Kingdom" → "london"
 * "Paris" → "paris"
 */
function extractCityName(locationStr) {
  if (!locationStr) return '';
  // Take the part before the first comma, trim, lowercase
  return locationStr.split(',')[0].trim().toLowerCase();
}

/**
 * Format a date string (YYYY-MM-DD) as DDMM for Aviasales URLs.
 * "2026-07-23" → "2307"
 */
function fmtAviasalesDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return '';
  const parts = dateStr.split('-');
  return parts[2] + parts[1];
}

/**
 * Resolve a city name to an IATA code using the local lookup table.
 * Returns null if not found.
 */
export function resolveIata(cityName) {
  const normalized = extractCityName(cityName);
  return MAJOR_CITY_IATA[normalized] || null;
}

/**
 * Build a valid Aviasales search URL with IATA codes and DDMM date format.
 *
 * @param {string} departureCity - e.g. "London" or "London, United Kingdom"
 * @param {string} destinationCity - e.g. "Paris" or "Paris, France"
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string} - Full Aviasales search URL, or fallback short link if IATA unresolved
 */
export function buildAviasalesSearchUrl(departureCity, destinationCity, startDate, endDate) {
  const originIata = resolveIata(departureCity);
  const destIata = resolveIata(destinationCity);

  // If either city can't be resolved, use the fallback short link — never construct a broken URL
  if (!originIata || !destIata) {
    console.warn(
      `[aviasalesUrl] Could not resolve IATA: origin="${departureCity}"→${originIata}, dest="${destinationCity}"→${destIata}. Using fallback link.`
    );
    return AVIASALES_FALLBACK_LINK;
  }

  const departPart = fmtAviasalesDate(startDate);
  const returnPart = fmtAviasalesDate(endDate);

  return `https://www.aviasales.com/search/${originIata}${departPart}${destIata}${returnPart}?marker=${AFFILIATE_MARKER}`;
}