import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Common airline IATA code → human name mapping
const AIRLINE_NAMES = {
  AA: 'American Airlines', AF: 'Air France', BA: 'British Airways', DL: 'Delta Air Lines',
  EK: 'Emirates', ET: 'Ethiopian Airlines', EY: 'Etihad Airways', IB: 'Iberia',
  KL: 'KLM', LH: 'Lufthansa', LX: 'Swiss', QR: 'Qatar Airways', SK: 'SAS',
  SQ: 'Singapore Airlines', TK: 'Turkish Airlines', UA: 'United Airlines',
  VS: 'Virgin Atlantic', U2: 'easyJet', FR: 'Ryanair', VY: 'Vueling',
  BT: 'airBaltic', LO: 'LOT Polish', A3: 'Aegean', OS: 'Austrian Airlines',
  AZ: 'ITA Airways', SU: 'Aeroflot', S7: 'S7 Airlines', FZ: 'flydubai',
  G9: 'Air Arabia', WY: 'Oman Air', MS: 'EgyptAir', AT: 'Royal Air Maroc',
  SA: 'South African Airways', KQ: 'Kenya Airways', RJ: 'Royal Jordanian',
  AI: 'Air India', '6E': 'IndiGo', SG: 'SpiceJet', UK: 'Vistara',
  CX: 'Cathay Pacific', CA: 'Air China', MU: 'China Eastern', CZ: 'China Southern',
  JL: 'Japan Airlines', NH: 'ANA', KE: 'Korean Air', OZ: 'Asiana Airlines',
  TG: 'Thai Airways', MH: 'Malaysia Airlines', AK: 'AirAsia', GA: 'Garuda Indonesia',
  QF: 'Qantas', JQ: 'Jetstar', VA: 'Virgin Australia', NZ: 'Air New Zealand',
  LA: 'LATAM', AV: 'Avianca', CM: 'Copa Airlines', AM: 'Aeromexico',
  AC: 'Air Canada', WS: 'WestJet', B6: 'JetBlue', WN: 'Southwest',
  NK: 'Spirit', F9: 'Frontier', AS: 'Alaska Airlines', HA: 'Hawaiian Airlines',
  G3: 'GOL', AD: 'Azul', W6: 'Wizz Air', PC: 'Pegasus',
  HY: 'Uzbekistan Airways', KC: 'Air Astana', J2: 'Azerbaijan Airlines',
  WZ: 'Red Wings', DP: 'Pobeda', U6: 'Ural Airlines',
};

// Known sub-areas/districts without their own airport → nearest major airport city
const AREA_TO_AIRPORT_CITY = {
  // Bali sub-areas → Denpasar (DPS)
  'uluwatu': 'Denpasar', 'ubud': 'Denpasar', 'sanur': 'Denpasar',
  'seminyak': 'Denpasar', 'kuta': 'Denpasar', 'legian': 'Denpasar',
  'canggu': 'Denpasar', 'nusa dua': 'Denpasar', 'jimbaran': 'Denpasar',
  'amed': 'Denpasar', 'lovina': 'Denpasar', 'padangbai': 'Denpasar',
  'sidemen': 'Denpasar', 'munduk': 'Denpasar', 'bali': 'Denpasar',
  // Gili Islands / Lombok → Mataram (LOP)
  'gili trawangan': 'Mataram', 'gili air': 'Mataram', 'gili meno': 'Mataram',
  'lombok': 'Mataram', 'senggigi': 'Mataram',
  // Thai islands
  'phi phi': 'Phuket', 'koh lanta': 'Krabi', 'railay': 'Krabi', 'ao nang': 'Krabi',
  'koh phangan': 'Koh Samui', 'koh tao': 'Koh Samui',
  // Vietnam
  'hoi an': 'Da Nang', 'sapa': 'Hanoi', 'ha long': 'Hanoi',
  // Spain (Canary Islands — Costa Adeje area uses Tenerife South Airport)
  'costa adeje': 'Tenerife', 'playa de las americas': 'Tenerife',
  'los cristianos': 'Tenerife', 'el medano': 'Tenerife', 'adeje': 'Tenerife',
  // Italy
  'positano': 'Naples', 'amalfi': 'Naples', 'ravello': 'Naples',
  'capri': 'Naples', 'sorrento': 'Naples',
  'cinque terre': 'Pisa', 'manarola': 'Pisa', 'vernazza': 'Pisa',
};

// Hardcoded lookup: ~60 most common major world cities / resort areas → IATA code.
// Skip the autocomplete API entirely for these — eliminates a network round-trip
// and prevents resolution failures on popular routes like London→Paris.
const MAJOR_CITY_IATA = {
  // Europe
  'london': 'LON', 'paris': 'PAR', 'amsterdam': 'AMS', 'berlin': 'BER',
  'rome': 'ROM', 'madrid': 'MAD', 'barcelona': 'BCN', 'lisbon': 'LIS',
  'dublin': 'DUB', 'frankfurt': 'FRA', 'munich': 'MUC', 'vienna': 'VIE',
  'prague': 'PRG', 'athens': 'ATH', 'istanbul': 'IST', 'stockholm': 'STO',
  'copenhagen': 'CPH', 'oslo': 'OSL', 'helsinki': 'HEL', 'brussels': 'BRU',
  'zurich': 'ZRH', 'geneva': 'GVA', 'milan': 'MIL', 'nice': 'NCE',
  'manchester': 'MAN', 'edinburgh': 'EDI', 'birmingham': 'BHX',
  'warsaw': 'WAW', 'budapest': 'BUD', 'bucharest': 'BUH',
  // Middle East
  'dubai': 'DXB', 'abu dhabi': 'AUH', 'doha': 'DOH', 'tel aviv': 'TLV',
  'riyadh': 'RUH', 'jeddah': 'JED', 'muscat': 'MCT',
  // Asia-Pacific
  'tokyo': 'TYO', 'osaka': 'OSA', 'singapore': 'SIN', 'hong kong': 'HKG',
  'bangkok': 'BKK', 'kuala lumpur': 'KUL', 'seoul': 'SEL', 'shanghai': 'SHA',
  'beijing': 'BJS', 'delhi': 'DEL', 'mumbai': 'BOM', 'bangalore': 'BLR',
  'jakarta': 'JKT', 'manila': 'MNL', 'taipei': 'TPE', 'ho chi minh city': 'SGN',
  'hanoi': 'HAN', 'sydney': 'SYD', 'melbourne': 'MEL', 'auckland': 'AKL',
  'perth': 'PER', 'bali': 'DPS', 'denpasar': 'DPS', 'phuket': 'HKT',
  // Americas
  'new york': 'NYC', 'los angeles': 'LAX', 'chicago': 'CHI', 'miami': 'MIA',
  'san francisco': 'SFO', 'toronto': 'YTO', 'mexico city': 'MEX',
  'buenos aires': 'BUE', 'sao paulo': 'SAO', 'rio de janeiro': 'RIO',
  'boston': 'BOS', 'washington': 'WAS', 'seattle': 'SEA', 'las vegas': 'LAS',
  // Africa
  'johannesburg': 'JNB', 'cape town': 'CPT', 'cairo': 'CAI',
  'nairobi': 'NBO', 'casablanca': 'CMN',
  // Resort areas (common holiday destinations)
  'antalya': 'AYT', 'bodrum': 'BJV', 'tenerife': 'TFS', 'las palmas': 'LPA',
  'malaga': 'AGP', 'alicante': 'ALC', 'sharm el sheikh': 'SSH', 'hurghada': 'HRG',
  'marrakech': 'RAK', 'tunis': 'TUN',
};

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return '';
  }
}

// Format date as DDMM for Aviasales search URL
function fmtAviasalesDate(dateStr) {
  const parts = dateStr.split('-');
  return parts[2] + parts[1];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { departure_city, destination_city, start_date, duration_days, num_travelers, currency_code } = body;

    if (!departure_city || !destination_city || !start_date || !duration_days) {
      return Response.json({ error: 'departure_city, destination_city, start_date and duration_days are required' }, { status: 400 });
    }

    const token = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER');
    if (!token || !marker) {
      console.error('[searchFlightsHotels] TRAVELPAYOUTS_API_TOKEN or TRAVELPAYOUTS_MARKER not set');
      return Response.json({ error: 'Search service not configured' }, { status: 500 });
    }

    const adults = parseInt(num_travelers) || 1;
    const nights = parseInt(duration_days);
    const endDate = new Date(start_date);
    endDate.setDate(endDate.getDate() + nights);
    const end_date = endDate.toISOString().split('T')[0];
    const currency = (currency_code || 'usd').toLowerCase();

    // ── 1. Resolve city names to IATA codes via Travelpayouts autocomplete ──
    //    Sub-areas without an airport (e.g., Uluwatu → Denpasar) are mapped to the nearest airport city first.
    const resolveIata = async (cityName) => {
      const normalized = cityName.toLowerCase().trim();

      // Check hardcoded major city table first — skip autocomplete API entirely
      if (MAJOR_CITY_IATA[normalized]) {
        console.log(`[resolveIata] "${cityName}" → ${MAJOR_CITY_IATA[normalized]} (hardcoded table, skipping API)`);
        return MAJOR_CITY_IATA[normalized];
      }

      // Sub-area mapping (e.g., "Costa Adeje" → "Tenerife" → then check major table)
      const mappedCity = AREA_TO_AIRPORT_CITY[normalized];
      if (mappedCity) {
        const mappedKey = mappedCity.toLowerCase();
        if (MAJOR_CITY_IATA[mappedKey]) {
          console.log(`[resolveIata] "${cityName}" → mapped to "${mappedCity}" → ${MAJOR_CITY_IATA[mappedKey]} (hardcoded table, skipping API)`);
          return MAJOR_CITY_IATA[mappedKey];
        }
      }

      const searchTerm = mappedCity || cityName;
      console.log(`[resolveIata] input cityName="${cityName}" | normalized="${normalized}" | mappedCity=${mappedCity || 'none'} | searchTerm="${searchTerm}"`);

      // Helper: single attempt to the autocomplete API with a given type filter
      const attempt = async (useCityFilter) => {
        const url = useCityFilter
          ? `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(searchTerm)}&locale=en&types[]=city`
          : `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(searchTerm)}&locale=en`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const code = data[0]?.code;
            console.log(`[resolveIata] searchTerm="${searchTerm}" cityFilter=${useCityFilter} status=${res.status} results=${data.length} firstCode=${code || 'null'}`);
            return code || null;
          }
          console.log(`[resolveIata] searchTerm="${searchTerm}" cityFilter=${useCityFilter} status=${res.status} (non-ok)`);
          return null;
        } catch (e) {
          console.log(`[resolveIata] searchTerm="${searchTerm}" cityFilter=${useCityFilter} FETCH_ERROR: ${e.message}`);
          return null;
        }
      };

      // Try city-filtered, then unfiltered — with one retry each if the fetch throws
      let code = await attempt(true);
      if (!code) code = await attempt(true); // retry city-filtered once
      if (!code) code = await attempt(false);  // fallback: no type filter
      if (!code) code = await attempt(false);  // retry no-filter once

      console.log(`[resolveIata] FINAL result for "${cityName}" (searchTerm="${searchTerm}"): ${code || 'NULL'}`);
      return code;
    };

    const originIata = await resolveIata(departure_city);
    const destIata = await resolveIata(destination_city);

    if (!originIata || !destIata) {
      return Response.json({
        flights: [],
        hotels: [],
        warning: 'Could not resolve city to airport code. Please try a major city name.',
      });
    }

    // ── 2. Fetch real flight prices from Travelpayouts Data API ──
    const bookingUrl = `https://www.aviasales.com/search/${originIata}${fmtAviasalesDate(start_date)}${destIata}${fmtAviasalesDate(end_date)}?marker=${marker}`;
    let flights = [];
    let nearbyFlightDates = [];

    // Single normalization function — works for both v1/cheap and v2/latest response shapes
    const normalizeFlight = (raw) => {
      const airlineCode = raw.airline || '';
      const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode || 'Multiple Airlines';
      const hasFlightNum = airlineCode && raw.flight_number;
      return {
        airline: airlineName,
        flight_number: hasFlightNum ? `${airlineCode}${raw.flight_number}` : '—',
        depart_time: formatDateTime(raw.departure_at || raw.depart_date),
        arrive_time: '',
        depart_airport: raw.origin || originIata,
        arrive_airport: raw.destination || destIata,
        duration: raw.duration ? formatDuration(raw.duration) : '—',
        is_direct: (raw.number_of_changes || 0) === 0,
        stops: raw.number_of_changes || 0,
        price: `${currency.toUpperCase()} ${Math.round(raw.price ?? raw.value ?? 0)}`,
        includes_baggage: false,
        includes_meals: false,
        source: 'Aviasales',
        booking_url: bookingUrl,
      };
    };

    try {
      // Try cheap prices for exact dates first
      const flightUrl = `https://api.travelpayouts.com/v1/prices/cheap?origin=${originIata}&destination=${destIata}&depart_date=${start_date}&return_date=${end_date}&currency=${currency}&token=${token}`;
      const flightRes = await fetch(flightUrl);
      const flightData = await flightRes.json();
      console.log('[searchFlightsHotels] cheap API success:', flightData.success, '| has data:', !!flightData.data);

      if (flightData.success && flightData.data) {
        const routeKey = Object.keys(flightData.data)[0];
        const routeData = flightData.data[routeKey] || {};
        flights = Object.values(routeData)
          .sort((a, b) => (a.price || 0) - (b.price || 0))
          .slice(0, 2)
          .map(normalizeFlight);
      }

      // Fallback: latest prices for the route (no exact date match)
      if (flights.length === 0) {
        const latestUrl = `https://api.travelpayouts.com/v2/prices/latest?origin=${originIata}&destination=${destIata}&currency=${currency}&limit=3&token=${token}`;
        const latestRes = await fetch(latestUrl);
        const latestData = await latestRes.json();
        console.log('[searchFlightsHotels] latest API success:', latestData.success, '| data is array:', Array.isArray(latestData.data), '| count:', latestData.data?.length);

        if (latestData.success && Array.isArray(latestData.data)) {
          flights = latestData.data
            .sort((a, b) => (a.value || 0) - (b.value || 0))
            .slice(0, 2)
            .map(normalizeFlight);
        }
      }

      // ±3 day window fallback: use calendar API to find nearby dates with availability
      if (flights.length === 0) {
        try {
          const monthStr = start_date.substring(0, 7); // "2026-08"
          const calUrl = `https://api.travelpayouts.com/v1/prices/calendar?origin=${originIata}&destination=${destIata}&depart_date=${monthStr}&currency=${currency}&token=${token}`;
          const calRes = await fetch(calUrl);
          const calData = await calRes.json();
          if (calData.success && calData.data) {
            const baseDate = new Date(start_date + 'T00:00:00Z');
            for (let offset = -3; offset <= 3; offset++) {
              if (offset === 0) continue; // exact date already tried
              const d = new Date(baseDate);
              d.setUTCDate(d.getUTCDate() + offset);
              const dateStr = d.toISOString().split('T')[0];
              const entry = calData.data[dateStr];
              if (entry && entry.price) {
                const nearbyEnd = new Date(d);
                nearbyEnd.setUTCDate(nearbyEnd.getUTCDate() + nights);
                const nearbyEndStr = nearbyEnd.toISOString().split('T')[0];
                nearbyFlightDates.push({
                  date: dateStr,
                  end_date: nearbyEndStr,
                  price: `${currency.toUpperCase()} ${Math.round(entry.price)}`,
                  airline: AIRLINE_NAMES[entry.airline] || entry.airline || 'Airline',
                  is_direct: (entry.transfers || 0) === 0,
                  booking_url: `https://www.aviasales.com/search/${originIata}${fmtAviasalesDate(dateStr)}${destIata}${fmtAviasalesDate(nearbyEndStr)}?marker=${marker}`,
                });
              }
            }
            nearbyFlightDates.sort((a, b) => new Date(a.date) - new Date(b.date));
          }
        } catch (e) {
          console.warn('[searchFlightsHotels] Calendar API error:', e.message);
        }
      }
    } catch (e) {
      console.warn('[searchFlightsHotels] Flight API error:', e.message);
    }

    // Last resort: if no flights AND no nearby dates, provide an Aviasales search link
    if (flights.length === 0 && nearbyFlightDates.length === 0) {
      flights = [{
        airline: 'Search on Aviasales',
        flight_number: `${originIata} → ${destIata}`,
        depart_time: '',
        arrive_time: '',
        depart_airport: originIata,
        arrive_airport: destIata,
        duration: '—',
        is_direct: false,
        stops: 0,
        price: 'See live prices',
        includes_baggage: false,
        includes_meals: false,
        source: 'Aviasales',
        booking_url: bookingUrl,
      }];
    }

    // ── 3. Hotels — attempt Hotellook search API, fall back to Booking.com + Expedia search links ──
    let hotels = [];
    try {
      // Hotellook search API (async: start session → poll for results)
      const hotelStartUrl = `https://search.hotellook.com/api/v2/search/start.json?city=${destIata}&checkIn=${start_date}&checkOut=${end_date}&adultsCount=${adults}&limit=5&currency=${currency}&token=${token}`;
      console.log('[searchFlightsHotels] Starting hotel search:', hotelStartUrl);
      const hotelStartRes = await fetch(hotelStartUrl);
      const hotelStartData = await hotelStartRes.json();
      console.log('[searchFlightsHotels] Hotel search start:', JSON.stringify(hotelStartData).substring(0, 200));

      if (hotelStartData.searchId) {
        // Poll for results — up to 4 attempts, 1.5s apart (search takes a few seconds)
        for (let attempt = 0; attempt < 4; attempt++) {
          await new Promise(r => setTimeout(r, 1500));
          const hotelResultUrl = `https://search.hotellook.com/api/v2/search/getResult.json?searchId=${hotelStartData.searchId}&limit=5&sortBy=price&sortAsc=1&currency=${currency}&token=${token}`;
          const hotelResultRes = await fetch(hotelResultUrl);
          const hotelResultData = await hotelResultRes.json();
          console.log(`[searchFlightsHotels] Hotel poll ${attempt + 1}: status=${hotelResultData.status}, count=${hotelResultData.result?.length || 0}`);

          if (hotelResultData.status === 'done' && Array.isArray(hotelResultData.result) && hotelResultData.result.length > 0) {
            hotels = hotelResultData.result
              .filter(h => h.price && h.price > 0)
              .sort((a, b) => (a.price || 0) - (b.price || 0))
              .slice(0, 2)
              .map(h => ({
                name: h.name || 'Hotel',
                stars: h.stars || 0,
                rating: h.rating ? String(h.rating) : '',
                location_desc: h.location?.address || `${destination_city}`,
                amenities: h.amenities || [],
                price_per_night: `${currency.toUpperCase()} ${Math.round((h.price || 0) / Math.max(nights, 1))}`,
                total_price: `${currency.toUpperCase()} ${Math.round(h.price || 0)}`,
                source: 'Hotellook',
                booking_url: h.url || `https://search.hotellook.com/?destination=${destIata}&checkIn=${start_date}&checkOut=${end_date}&adults=${adults}&marker=${marker}`,
              }));
            break;
          }
          if (hotelResultData.status === 'error') {
            console.warn('[searchFlightsHotels] Hotel search error:', hotelResultData.error || hotelResultData.message);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[searchFlightsHotels] Hotel search API error:', e.message);
    }

    // Fallback: Expedia Hotels + Hotels.com search links with dates, destination & tracking params
    if (hotels.length === 0) {
      console.log('[searchFlightsHotels] No Hotellook results — using Expedia/Hotels.com fallback');
      const encDest = encodeURIComponent(destination_city);
      // Expedia: PHG/Partnerize tracking params (same as Car Rentals affiliate link)
      const expediaTracking = 'siteid=1&langid=1033&clickref=1100lDbMvvrU&affcid=US.DIRECT.PHG.1100l430135.0&ref_id=1100lDbMvvrU&my_ad=AFF.US.DIRECT.PHG.1100l430135.0&afflid=1100lDbMvvrU&affdtl=PHG.1100lDbMvvrU.VPUxenLAiW';
      const expediaSearchUrl = `https://www.expedia.com/Hotel-Search?destination=${encDest}&startDate=${start_date}&endDate=${end_date}&adults=${adults}&${expediaTracking}`;
      // Hotels.com: Partnerize short link with ?destination= deep-link override (NOT the Travelpayouts marker)
      const hotelsComSearchUrl = `https://www.hotels.com/affiliate/dpXZF4i?destination=${encodeURIComponent(`https://www.hotels.com/Hotel-Search?destination=${encDest}&startDate=${start_date}&endDate=${end_date}&adults=${adults}`)}`;
      hotels = [
        {
          name: `Search hotels in ${destination_city}`,
          stars: 0,
          rating: '',
          location_desc: `Check available hotels for ${start_date} to ${end_date}`,
          amenities: ['Member prices available', 'Bundle & save'],
          price_per_night: '—',
          total_price: '—',
          source: 'Expedia Hotels',
          booking_url: expediaSearchUrl,
        },
        {
          name: `Search hotels in ${destination_city}`,
          stars: 0,
          rating: '',
          location_desc: `Check available hotels for ${start_date} to ${end_date}`,
          amenities: ['Secret Prices available', 'Free cancellation on most rooms'],
          price_per_night: '—',
          total_price: '—',
          source: 'Hotels.com',
          booking_url: hotelsComSearchUrl,
        },
      ];
    }

    return Response.json({ flights, hotels, nearby_flight_dates: nearbyFlightDates });
  } catch (error) {
    console.error('[searchFlightsHotels] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});