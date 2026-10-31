/**
 * Shared hotel affiliate link builders — single source of truth for
 * Expedia, Hotels.com, and Booking.com tracked search URLs.
 *
 * TRACKING NETWORKS:
 * - Expedia:  Partnerize (PHG) — expanded tracking params from short link
 *             https://expedia.com/affiliates/expedia-home.8hD3CIF
 * - Hotels.com: Partnerize (PHG) — short link with ?destination= deep-link override
 *             https://www.hotels.com/affiliate/dpXZF4i
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

// ── Hotels.com Partnerize short link ──
// Deep-link format: append ?destination={encoded_url} to the short link.
// The short link sets Partnerize tracking cookies, then redirects to the
// destination URL (the Hotels.com search page with pre-filled query).
const HOTELS_COM_SHORT_LINK = 'https://www.hotels.com/affiliate/dpXZF4i';

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

/**
 * Build a tracked Hotels.com hotel search URL with destination, dates, and adults pre-filled.
 * Uses the Partnerize short link with ?destination= deep-link override.
 */
export function buildHotelsComSearchUrl(destination, startDate, endDate, adults = 1) {
  const searchUrl = `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(destination)}&startDate=${startDate}&endDate=${endDate}&adults=${adults}`;
  return `${HOTELS_COM_SHORT_LINK}?destination=${encodeURIComponent(searchUrl)}`;
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
  if (adults > 1) params.set('group_adults', String(adults));
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
 * Build a tracked Hotels.com search URL for a specific property name + destination.
 * Uses the Partnerize short link with ?destination= deep-link override.
 */
export function buildHotelsComPropertyUrl(propertyName, destination) {
  const query = `${propertyName}, ${destination}`;
  const searchUrl = `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(query)}`;
  return `${HOTELS_COM_SHORT_LINK}?destination=${encodeURIComponent(searchUrl)}`;
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