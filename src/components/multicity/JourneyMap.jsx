import { useMemo, useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getCityCoords, resolveCityCoords } from "@/lib/cityCoordinates";
import { splitLocation } from "@/lib/journeyContext";

// Auto-fit bounds when points change — keeps the full journey visible.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 4);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    }
  }, [points]);
  return null;
}

// Detects repeated tile-load failures (bad token, provider down) and triggers
// a clean fallback instead of rendering broken "Access blocked" tile grids.
// Uses a counter so a single transient network blip doesn't hide the map.
function TileErrorHandler({ onError }) {
  const map = useMap();
  const errorCount = useRef(0);
  useEffect(() => {
    const handler = () => {
      errorCount.current += 1;
      if (errorCount.current >= 5) onError();
    };
    map.on("tileerror", handler);
    return () => map.off("tileerror", handler);
  }, [map, onError]);
  return null;
}

// Create a numbered div icon for a pin.
const createPinIcon = (label, isSelected, isOrigin) => {
  const bg = isOrigin ? "#64748b" : isSelected ? "#0d9488" : "#14b8a6";
  const ring = isSelected
    ? "box-shadow: 0 0 0 6px rgba(20,184,166,0.25);"
    : "box-shadow: 0 1px 4px rgba(0,0,0,0.4);";
  const size = isSelected ? 32 : 28;
  return L.divIcon({
    className: "journey-pin",
    html: `<div style="
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: ${bg}; color: white; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; border: 2px solid white;
      ${ring}
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Live visual journey map for the Multi-City Journey Builder.
// Deterministic — no AI/LLM calls. Uses cached city coordinates.
// Updates immediately when stops are added, removed, or changed.
//
// Tile provider: Mapbox (streets-v12 style). Token fetched from getMapConfig
// backend function so it stays out of the client source bundle. If the token
// is missing or tiles fail repeatedly, a clean fallback UI is shown instead of
// broken provider error tiles. Public OSM tile.openstreetmap.org is NEVER used
// (it 403-blocks apps violating volunteer-run tile usage policy).
export default function JourneyMap({ stops, startCity, endCity, startCityCoords, endCityCoords, selectedStop, onStopClick, className }) {
  const [resolvedCoords, setResolvedCoords] = useState({});
  // Mapbox token: null = loading, string = ready, false = unavailable
  const [mapboxToken, setMapboxToken] = useState(null);
  const [tileFailed, setTileFailed] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Fetch Mapbox access token once from the backend (kept out of client source).
  useEffect(() => {
    let cancelled = false;
    base44.functions
      .invoke("getMapConfig", {})
      .then((res) => {
        if (!cancelled) setMapboxToken(res.data?.mapboxToken || false);
      })
      .catch(() => {
        if (!cancelled) setMapboxToken(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Collect all unique city names needing coordinate resolution
  const allCityKeys = useMemo(() => {
    const cities = [];
    if (startCity && !startCityCoords) cities.push(splitLocation(startCity).city);
    (stops || []).forEach((s) => { if (s.destination && s.destination_lat == null) cities.push(splitLocation(s.destination).city); });
    if (endCity && endCity !== startCity && !endCityCoords) cities.push(splitLocation(endCity).city);
    return [...new Set(cities.filter(Boolean).map((c) => c.toLowerCase().trim()))];
  }, [stops, startCity, endCity, startCityCoords, endCityCoords]);

  // Cities not in sync cache and not yet resolved — need async geocoding
  const missingKeys = useMemo(() => {
    return allCityKeys.filter((k) => !resolvedCoords[k] && !getCityCoords(k));
  }, [allCityKeys, resolvedCoords]);

  // Async-resolve missing cities via Nominatim (free OSM geocoding)
  useEffect(() => {
    if (missingKeys.length === 0) return;
    let cancelled = false;
    missingKeys.forEach(async (city) => {
      const coords = await resolveCityCoords(city);
      if (!cancelled && coords) {
        setResolvedCoords((prev) => ({ ...prev, [city.toLowerCase().trim()]: coords }));
      }
    });
    return () => { cancelled = true; };
  }, [missingKeys.join(",")]);

  // Sync lookup: resolved state → static cache → null (pin omitted)
  const lookupCoords = (cityName) => {
    const key = (cityName || "").toLowerCase().trim();
    return resolvedCoords[key] || getCityCoords(cityName);
  };

  const { pins, routeCoords } = useMemo(() => {
    const pins = [];
    const routeCoords = [];

    // Start city pin (origin) — use pre-resolved coords from Mapbox if available
    if (startCity) {
      const { city } = splitLocation(startCity);
      const coords = startCityCoords || lookupCoords(city);
      if (coords) {
        pins.push({ ...coords, label: startCity, type: "origin", index: -1 });
        routeCoords.push([coords.lat, coords.lng]);
      }
    }

    // Destination pins — use pre-resolved coords from Mapbox search when available
    (stops || []).forEach((stop, i) => {
      if (!stop.destination) return;
      const { city } = splitLocation(stop.destination);
      const coords = (stop.destination_lat != null && stop.destination_lng != null)
        ? { lat: stop.destination_lat, lng: stop.destination_lng }
        : lookupCoords(city);
      if (coords) {
        pins.push({
          ...coords,
          label: stop.destination,
          type: "stop",
          index: i,
          transport: stop.transport_type,
        });
        routeCoords.push([coords.lat, coords.lng]);
      }
    });

    // End city pin (return) — use pre-resolved coords from Mapbox if available
    if (endCity && endCity !== startCity) {
      const { city } = splitLocation(endCity);
      const coords = endCityCoords || lookupCoords(city);
      if (coords) {
        pins.push({ ...coords, label: endCity, type: "return", index: -2 });
        routeCoords.push([coords.lat, coords.lng]);
      }
    }

    return { pins, routeCoords };
  }, [stops, startCity, endCity, resolvedCoords]);

  const mapReady = mapboxToken && !tileFailed;

  // Avoid leaving an empty map surface when the map token resolves but the
  // tile provider never responds. The route labels remain useful as fallback.
  useEffect(() => {
    if (!mapReady || tilesLoaded) return undefined;
    const timeout = window.setTimeout(() => setTileFailed(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [mapReady, tilesLoaded]);

  return (
    <div className={`relative rounded-2xl border border-white/10 overflow-hidden h-full min-h-[300px] ${className || ""}`}>
      {/* Loading state — token still being fetched from backend */}
      {mapboxToken === null && (
        <div className="absolute inset-0 bg-[#0a0f14] flex items-center justify-center lg:bg-[#f5faff]">
          <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Fallback: no token or tiles failed — textual route only, no provider errors */}
      {(mapboxToken === false || tileFailed) && (
        <div className="absolute inset-0 bg-[#0a0f14] flex flex-col items-center justify-center p-6 text-center lg:bg-[#f5faff]">
          <AlertCircle className="w-7 h-7 text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-slate-300 mb-1">Journey map temporarily unavailable</p>
          {pins.length > 0 ? (
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              {pins.map((p) => p.label).join("  →  ")}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Add destinations to see your journey route</p>
          )}
        </div>
      )}

      {/* Live map — only when token is available and tiles haven't failed */}
      {mapReady && (
        <MapContainer
          key="journey-map"
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", background: "#f5faff" }}
        >
          <TileLayer
            url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}{r}?access_token=${mapboxToken}`}
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={20}
            eventHandlers={{ tileload: () => setTilesLoaded(true) }}
          />
          <TileErrorHandler onError={() => setTileFailed(true)} />

          {/* Route line connecting all stops in order */}
          {routeCoords.length >= 2 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: "#14b8a6", weight: 2, dashArray: "6 8", opacity: 0.7 }}
            />
          )}

          {/* Numbered pins */}
          {pins.map((pin, i) => {
            const label =
              pin.type === "origin" ? "●" : pin.type === "return" ? "↩" : String(pin.index + 1);
            const isSelected = pin.type === "stop" && selectedStop === pin.index;
            return (
              <Marker
                key={`${pin.lat},${pin.lng}-${i}`}
                position={[pin.lat, pin.lng]}
                icon={createPinIcon(label, isSelected, pin.type === "origin" || pin.type === "return")}
                eventHandlers={
                  pin.type === "stop" && onStopClick
                    ? { click: () => onStopClick(pin.index) }
                    : undefined
                }
              >
                <Tooltip direction="top" offset={[0, -16]}>
                  <span className="text-xs font-semibold">{pin.label}</span>
                </Tooltip>
              </Marker>
            );
          })}

          <FitBounds points={routeCoords} />
        </MapContainer>
      )}

      {/* Empty-state overlay — shown when map is live but no pins are available yet */}
      {mapReady && pins.length === 0 && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center p-6 text-center pointer-events-none">
          <div>
            <MapPin className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Add destinations to see your journey on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
