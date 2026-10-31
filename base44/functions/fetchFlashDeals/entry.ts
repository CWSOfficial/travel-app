import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth required to prevent abuse of the API token
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const currency = (body.currency || 'usd').toLowerCase();
    const originCity = (body.origin_city || '').toLowerCase().trim();

    const token = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    const marker = Deno.env.get('TRAVELPAYOUTS_MARKER');
    if (!token) {
      console.error('[fetchFlashDeals] TRAVELPAYOUTS_API_TOKEN not set');
      return Response.json({ error: 'Flash deals service not configured' }, { status: 500 });
    }

    const apiUrl = `https://api.travelpayouts.com/aviasales/v3/get_special_offers?currency=${currency}&limit=30&token=${token}`;

    const response = await fetch(apiUrl, {
      headers: { 'Accept-Encoding': 'gzip, deflate' },
    });

    if (!response.ok) {
      console.error(`[fetchFlashDeals] API returned ${response.status}: ${await response.text().catch(() => '')}`);
      return Response.json({ error: `Travel deals API returned ${response.status}` }, { status: 502 });
    }

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[fetchFlashDeals] Non-JSON response from special-offers endpoint');
      return Response.json({ deals: [], error: 'Unexpected response format from deals API' }, { status: 200 });
    }

    // Handle different response shapes
    let rawDeals = [];
    if (Array.isArray(json)) {
      rawDeals = json;
    } else if (json.data && Array.isArray(json.data)) {
      rawDeals = json.data;
    } else if (json.success === false) {
      console.error('[fetchFlashDeals] API error:', json.error);
      return Response.json({ deals: [], error: json.error || 'API returned error' }, { status: 200 });
    }

    // Compact IATA → ISO country code lookup for region-level matching
    const IATA_COUNTRY = {
      // United Kingdom
      LHR: 'GB', LGW: 'GB', STN: 'GB', LTN: 'GB', LCY: 'GB', SEN: 'GB', MAN: 'GB', EDI: 'GB', GLA: 'GB', BHX: 'GB', BRS: 'GB', NCL: 'GB', LPL: 'GB', LBA: 'GB', CWL: 'GB', BFS: 'GB', ABZ: 'GB', EMA: 'GB', EXT: 'GB', SOU: 'GB', NQY: 'GB', INV: 'GB',
      // United States
      JFK: 'US', LAX: 'US', ORD: 'US', ATL: 'US', DFW: 'US', DEN: 'US', SFO: 'US', SEA: 'US', LAS: 'US', MIA: 'US', BOS: 'US', PHX: 'US', IAD: 'US', DCA: 'US', EWR: 'US', SJC: 'US', OAK: 'US', SAN: 'US', PDX: 'US', MSP: 'US', DTW: 'US', PHL: 'US', LGA: 'US', BWI: 'US', FLL: 'US', MCO: 'US', TPA: 'US', IAH: 'US', HOU: 'US', AUS: 'US', DAL: 'US', SLT: 'US', ICT: 'US', MCI: 'US', STL: 'US', IND: 'US', CMH: 'US', CVG: 'US', MEM: 'US', BNA: 'US', CLT: 'US', RDU: 'US', JAX: 'US', MSY: 'US', HNL: 'US', ANC: 'US',
      // Ireland
      DUB: 'IE', ORK: 'IE', SNN: 'IE', NOC: 'IE',
      // Germany
      FRA: 'DE', MUC: 'DE', DUS: 'DE', BER: 'DE', HAM: 'DE', CGN: 'DE', STR: 'DE', NUE: 'DE', LEJ: 'DE',
      // France
      CDG: 'FR', ORY: 'FR', NCE: 'FR', LYS: 'FR', MRS: 'FR', BOD: 'FR', TLS: 'FR', BIA: 'FR',
      // Spain
      MAD: 'ES', BCN: 'ES', AGP: 'ES', VLC: 'ES', SVQ: 'ES', PMI: 'ES', BIO: 'ES', ALC: 'ES', TFS: 'ES', LPA: 'ES',
      // Italy
      FCO: 'IT', MXP: 'IT', LIN: 'IT', VCE: 'IT', NAP: 'IT', CIA: 'IT', BLQ: 'IT', FLR: 'IT', TRN: 'IT', BRI: 'IT', CTA: 'IT',
      // Netherlands
      AMS: 'NL', EIN: 'NL', RTM: 'NL',
      // Australia
      SYD: 'AU', MEL: 'AU', BNE: 'AU', PER: 'AU', ADL: 'AU', OOL: 'AU', CNS: 'AU', DRW: 'AU',
      // Canada
      YYZ: 'CA', YVR: 'CA', YUL: 'CA', YYC: 'CA', YOW: 'CA', YEG: 'CA', YHZ: 'CA',
    };

    const CITY_COUNTRY = {
      // UK cities
      london: 'GB', manchester: 'GB', edinburgh: 'GB', glasgow: 'GB', birmingham: 'GB', bristol: 'GB', liverpool: 'GB', leeds: 'GB', newcastle: 'GB', belfast: 'GB', cardiff: 'GB', aberdeen: 'GB', nottingham: 'GB', sheffield: 'GB', southampton: 'GB', exeter: 'GB', newquay: 'GB', inverness: 'GB',
      // US cities
      'new york': 'US', 'los angeles': 'US', chicago: 'US', atlanta: 'US', dallas: 'US', denver: 'US', 'san francisco': 'US', seattle: 'US', 'las vegas': 'US', miami: 'US', boston: 'US', phoenix: 'US', 'washington': 'US', houston: 'US', austin: 'US', orlando: 'US', tampa: 'US', philadelphia: 'US', minneapolis: 'US', detroit: 'US', honolulu: 'US', anchorage: 'US', wichita: 'US',
      // Irish cities
      dublin: 'IE', cork: 'IE', shannon: 'IE',
      // German cities
      frankfurt: 'DE', munich: 'DE', dusseldorf: 'DE', berlin: 'DE', hamburg: 'DE', cologne: 'DE', stuttgart: 'DE', nuremberg: 'DE',
      // French cities
      paris: 'FR', nice: 'FR', lyon: 'FR', marseille: 'FR', bordeaux: 'FR', toulouse: 'FR',
      // Spanish cities
      madrid: 'ES', barcelona: 'ES', malaga: 'ES', valencia: 'ES', seville: 'ES', palma: 'ES', bilbao: 'ES',
      // Italian cities
      rome: 'IT', milan: 'IT', venice: 'IT', naples: 'IT', florence: 'IT', bologna: 'IT', turin: 'IT', bari: 'IT', catania: 'IT',
      // Dutch cities
      amsterdam: 'NL', eindhoven: 'NL',
      // Australian cities
      sydney: 'AU', melbourne: 'AU', brisbane: 'AU', perth: 'AU', adelaide: 'AU', cairns: 'AU', darwin: 'AU',
      // Canadian cities
      toronto: 'CA', vancouver: 'CA', montreal: 'CA', calgary: 'CA', ottawa: 'CA', edmonton: 'CA', halifax: 'CA',
    };

    const userCountry = originCity ? CITY_COUNTRY[originCity] : null;

    // Determine whether a deal is relevant to the user's origin.
    // Match = same city name OR same country (region proximity).
    const isDealRelevant = (d) => {
      if (!originCity) return false;
      const dealOriginName = (d.origin_name || '').toLowerCase();
      const dealIata = (d.origin || '').toUpperCase();
      // Direct city name match (bidirectional includes)
      if (dealOriginName.includes(originCity) || originCity.includes(dealOriginName)) return true;
      // Same-country match via IATA code lookup
      if (userCountry) {
        const dealCountry = IATA_COUNTRY[dealIata];
        if (dealCountry === userCountry) return true;
      }
      return false;
    };

    // Sort relevant deals to front, irrelevant deals to back
    if (originCity) {
      rawDeals.sort((a, b) => {
        return (isDealRelevant(a) ? 0 : 1) - (isDealRelevant(b) ? 0 : 1);
      });
    }

    // Format deals for the frontend — the v3 API provides city names, price, dates, airline, and a pre-built link
    const deals = rawDeals.slice(0, 20).map((d) => {
      // The API returns a link path like "/search/ICT1107PAR1?t=AY..." — prepend domain and append marker
      let bookingUrl = '';
      if (d.link) {
        const prefix = 'https://www.aviasales.com';
        bookingUrl = d.link.startsWith('http') ? d.link : prefix + d.link;
        // Append affiliate marker if not already present
        if (marker && !bookingUrl.includes('marker=')) {
          bookingUrl += (bookingUrl.includes('?') ? '&' : '?') + 'marker=' + marker;
        }
      }

      return {
        origin_match: isDealRelevant(d),
        origin: d.origin || '',
        origin_city: d.origin_name || d.origin || 'Unknown',
        origin_airport: d.origin_airport || d.origin || '',
        destination: d.destination || '',
        destination_city: d.destination_name || d.destination || 'Unknown',
        destination_airport: d.destination_airport || d.destination || '',
        airline: d.airline_title || d.airline || '',
        flight_number: d.flight_number || '',
        departure_at: d.departure_at || '',
        duration: d.duration || 0,
        price: d.price || 0,
        currency: currency.toUpperCase(),
        title: d.title || '',
        booking_url: bookingUrl,
      };
    });

    return Response.json({ deals });
  } catch (error) {
    console.error('[fetchFlashDeals] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});