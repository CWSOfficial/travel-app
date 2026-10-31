import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { destination_city, travel_date, mode } = body;
    if (!destination_city) {
      return Response.json({ error: 'destination_city is required' }, { status: 400 });
    }

    // ── Validate travel_date before it touches a cache query or an outbound
    // URL: it is client-controlled, so a strict YYYY-MM-DD check prevents
    // anything else (e.g. injected query params) reaching the WeatherAPI URL.
    let safeTravelDate = null;
    if (travel_date != null && travel_date !== '') {
      const str = String(travel_date).trim();
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
      if (!ok) {
        return Response.json({ error: 'invalid travel_date' }, { status: 400 });
      }
      safeTravelDate = str;
    }

    const cityKey = destination_city.toLowerCase().trim();
    const useMode = mode === 'history' ? 'history' : 'forecast';

    // ── 1. Check cache (30-min TTL) — anonymous visitors can read cached rows ──
    const cached = await base44.asServiceRole.entities.WeatherCache.filter(
      { city: cityKey, travel_date: safeTravelDate || null },
      '-last_fetched', 1
    );
    if (cached.length > 0) {
      const entry = cached[0];
      const age = Date.now() - new Date(entry.last_fetched).getTime();
      if (age < CACHE_TTL_MS) {
        const raw = entry.raw_response || {};
        const fd = raw.forecast?.forecastday?.[0];
        const day = fd?.day;
        return Response.json({
          temperature: entry.temperature,
          maxtemp_c: day?.maxtemp_c ?? null,
          mintemp_c: day?.mintemp_c ?? null,
          condition_text: day?.condition?.text ?? null,
          date: fd?.date ?? (safeTravelDate || null),
          severe_weather_alerts: entry.severe_weather_alerts || [],
          is_outdoor_safe: entry.is_outdoor_safe,
          source: useMode,
          cached: true,
        });
      }
    }

    // ── 2. Cache miss/stale — require authentication before hitting the live API ──
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required to fetch live weather data' }, { status: 401 });

    // ── 3. Fetch fresh data from WeatherAPI.com (forecast or history endpoint) ──
    const apiKey = Deno.env.get('WEATHER_API_KEY');
    if (!apiKey) {
      console.error('[fetchDestinationWeather] WEATHER_API_KEY not set');
      return Response.json({ error: 'Weather API key not configured' }, { status: 500 });
    }

    const endpoint = useMode === 'history' ? 'history.json' : 'forecast.json';
    let url = `https://api.weatherapi.com/v1/${endpoint}?key=${apiKey}&q=${encodeURIComponent(destination_city)}`;
    if (useMode === 'history') {
      if (safeTravelDate) url += `&dt=${encodeURIComponent(safeTravelDate)}`;
    } else {
      url += `&days=1`;
      if (safeTravelDate) url += `&dt=${encodeURIComponent(safeTravelDate)}`;
    }

    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('[fetchDestinationWeather] API error:', apiRes.status, errText);
      return Response.json({ error: 'Weather API request failed', status: apiRes.status }, { status: 502 });
    }
    const data = await apiRes.json();

    // ── 4. Extract clean fields (both endpoints share forecast.forecastday[0].day) ──
    const forecastDay = data.forecast?.forecastday?.[0];
    const day = forecastDay?.day;
    const tempC = day?.avgtemp_c ?? data.current?.temp_c ?? null;
    const maxC = day?.maxtemp_c ?? null;
    const minC = day?.mintemp_c ?? null;
    const conditionText = day?.condition?.text ?? null;
    const dateStr = forecastDay?.date ?? (safeTravelDate || null);
    const alerts = data.alerts?.alert || [];

    const hasSevereAlert = alerts.some((a) =>
      /severe|extreme|danger|storm|hurricane|tornado|flood|blizzard|heatwave|warning/i.test(
        a.headline || a.severity || a.event || ''
      )
    );
    const is_outdoor_safe = !hasSevereAlert && tempC !== null && tempC > -10 && tempC < 45;

    // ── 5. Update cache ──
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.WeatherCache.deleteMany({
      city: cityKey,
      travel_date: safeTravelDate || null,
    });
    await base44.asServiceRole.entities.WeatherCache.create({
      city: cityKey,
      travel_date: safeTravelDate || null,
      temperature: tempC,
      severe_weather_alerts: alerts,
      is_outdoor_safe,
      raw_response: data,
      last_fetched: now,
    });

    return Response.json({
      temperature: tempC,
      maxtemp_c: maxC,
      mintemp_c: minC,
      condition_text: conditionText,
      date: dateStr,
      severe_weather_alerts: alerts,
      is_outdoor_safe,
      source: useMode,
      cached: false,
    });
  } catch (error) {
    console.error('[fetchDestinationWeather] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});