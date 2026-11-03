/**
 * Shared hotel affiliate link builders — single source of truth for
 * Expedia, Hotels.com, and Booking.com tracked search URLs.
 *
 * TRACKING NETWORKS:
 * - Expedia:  Partnerize (PHG) — expanded tracking params from short link
 *             https://expedia.com/affiliates/expedia-home.8hD3CIF
 * - Hotels.com: direct search URL (the previous short-link override did not preserve search criteria)
 * - Booking.com: Commission Junction (CJ) — click link with ?url= deep-link override
 *             https://www.dpbolvw.net/click-101812508-15734754
 *
 * IMPORTANT: The Travelpayouts marker (738679) is NOT used for ANY hotel links.
 * It remains correctly scoped to Aviasales flights and car rentals only
 * (see src/lib/aviasalesUrl.js and the RentalCars link in FlightHotelPicker.jsx).
 */

// ── Expedia Partnerize (PHG) tracking parameters ──
// Expanded form of the Partnerize short link https://expedia.com/affiliates/expedia-home.8hD3CIF
const EXPEDIA_TRACKING_PARAMS = {
  siteid: '1',
  langid: '1033',
  clickref: '1100lDbMvvrU',
  affcid: 'US.DIRECT.PHG.1100l430135.0',
  ref_id: '1100lDbMvvrU',
  my_ad: 'AFF.US.DIRECT.PHG.1100l430135.0',
  afflid: '1100lDbMvvrU',
  affdtl: 'PHG.1100lDbMvvrU.VPUxenLAiW',
};

// ── Booking.com CJ (Commission Junction) tracking ──
// PID=101812508, AID=15734754
// Deep-link format: append ?url={encoded_destination_url} to the CJ click link.
// The CJ link tracks the click, then redirects to the Booking.com search page.
const BOOKING_CJ_CLICK_URL = 'https://www.dpbolvw.net/click-101812508-15734754';

// Helper: build the PHG tracking query string from EXPEDIA_TRACKING_PARAMS
function expediaTrackingString() {
  return Object.entries(EXPEDIA_TRACKING_PARAMS)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

// ── Search-form URL builders (destination + dates + adults) ──

/**
 * Build a tracked Expedia hotel search URL with destination, dates, and adults pre-filled.
 * Uses Partnerize (PHG) tracking parameters for commission attribution.
 */
export function buildExpediaHotelSearchUrl(destination, startDate, endDate, adults = 1) {
  const base = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination)}&startDate=${startDate}&endDate=${endDate}&adults=${adults}`;
  return `${base}&${expediaTrackingString()}`;
}

/** Build a direct Hotels.com search URL with the user's destination and dates. */
export function buildHotelsComSearchUrl(destination, startDate, endDate, adults = 1) {
  const params = new URLSearchParams({
    destination: String(destination || '').trim(),
    startDate: startDate || '',
    endDate: endDate || '',
    adults: String(Math.max(1, Number(adults) || 1)),
    rooms: '1',
  });
  return `https://www.hotels.com/Hotel-Search?${params.toString()}`;
}

/**
 * Build a tracked Booking.com hotel search URL with destination, dates, and adults pre-filled.
 * Uses the CJ click link with ?url= deep-link override.
 */
export function buildBookingComSearchUrl(destination, startDate, endDate, adults = 1) {
  const checkIn = startDate ? startDate.replace(/-/g, '') : '';
  const checkOut = endDate ? endDate.replace(/-/g, '') : '';
  const params = new URLSearchParams({ ss: destination });
  if (checkIn) params.set('checkin', checkIn);
  if (checkOut) params.set('checkout', checkOut);
  params.set('group_adults', String(Math.max(1, Number(adults) || 1)));
  const searchUrl = `https://www.booking.com/searchresults.html?${params.toString()}`;
  return `${BOOKING_CJ_CLICK_URL}?url=${encodeURIComponent(searchUrl)}`;
}

// ── Property-specific search URL builders (hotel name + destination, no dates) ──

/**
 * Build a tracked Expedia search URL for a specific property name + destination.
 */
export function buildExpediaPropertyUrl(propertyName, destination) {
  const query = `${propertyName}, ${destination}`;
  const base = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(query)}`;
  return `${base}&${expediaTrackingString()}`;
}

/**
 * Build a Hotels.com search URL for a specific property name + destination.
 * No affiliate deep-link is configured for this property flow.
 */
export function buildHotelsComPropertyUrl(propertyName, destination) {
  const query = `${propertyName}, ${destination}`;
  return buildHotelsComSearchUrl(query);
}

/**
 * Build a tracked Booking.com search URL for a specific property name + destination.
 * Uses the CJ click link with ?url= deep-link override.
 */
export function buildBookingComPropertyUrl(propertyName, destination) {
  const query = `${propertyName}, ${destination}`;
  const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}`;
  return `${BOOKING_CJ_CLICK_URL}?url=${encodeURIComponent(searchUrl)}`;
}
