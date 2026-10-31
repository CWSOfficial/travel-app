import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, Navigation, Sparkles, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

// "Nearby & Live" homepage section — a full-width live-activity card that
// surfaces the top nearby thing to do. Uses real geolocation when available;
// otherwise falls back to the user's selected destination or a trending spot.
// Pre-revenue safe: never fabricates bookings, only surfaces discovery.

// Priority 3 fallback — featured destination when no trip or GPS is available.
const FEATURED_FALLBACK = {
  city: "Ooty",
  place_name: "Ooty Lake & Boat House",
  image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
  rating: 4.7,
  distance_km: 1.2,
  category: "Must See",
};

// City-specific featured place names for the Nearby & Live banner.
const PLACE_NAMES = {
  Ooty: "Ooty Lake & Boat House",
  London: "River Thames Sunset Cruise",
  Paris: "Seine River Evening Cruise",
  Tokyo: "Shinjuku Gyoen Garden",
  Kyoto: "Fushimi Inari Shrine",
  Bangkok: "Grand Palace & Wat Phra Kaew",
  Dubai: "Burj Khalifa Observation Deck",
  Bali: "Tegallalang Rice Terraces",
  Singapore: "Gardens by the Bay",
  Istanbul: "Hagia Sophia & Blue Mosque",
  Rome: "Colosseum & Roman Forum",
  "New York": "Central Park & Bethesda Terrace",
};

const DEFAULT_PLACE_IMAGE = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80";

const getPlaceName = (city) => PLACE_NAMES[city] || `${city} Top Attraction`;

export default function NearbyLive() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [locationLabel, setLocationLabel] = useState("Locating…");
  const [usingGps, setUsingGps] = useState(false);

  useEffect(() => {
    let active = true;

    // Reverse-geocode GPS coordinates to a city name (free, client-side, no key).
    const reverseGeocode = async (lat, lng) => {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await res.json();
        return data.city || data.locality || data.principalSubdivision || null;
      } catch {
        return null;
      }
    };

    // Priority 1 — Active Context: build from the user's selected destination / active trip.
    const buildFromDestination = (city) => {
      if (!city || !active) return false;
      setLocationLabel(`Exploring • ${city}`);
      setActivity({
        place_name: getPlaceName(city),
        image_url: DEFAULT_PLACE_IMAGE,
        rating: 4.7,
        distance_km: 1.2,
        category: "Must See",
      });
      return true;
    };

    // Priority 3 — Fallback: featured destination when no trip or GPS is available.
    const applyFallback = () => {
      if (!active) return;
      setLocationLabel(`Exploring • ${FEATURED_FALLBACK.city}`);
      setActivity(FEATURED_FALLBACK);
    };

    (async () => {
      const TAG = "[NearbyLive]";

      // ── Priority 1: Active Context (selectedDestination / activeTripLocation) ──
      let p1Reason = "no trip data";
      try {
        const trips = await base44.entities.Trip.list("-updated_date", 1);
        if (!active) { console.log(TAG, "Priority 1: component unmounted during trip lookup"); return; }
        if (trips?.length) {
          const trip = trips[0];
          const dest = trip?.destination_details || trip?.selected_destination;
          const city = dest?.city || (dest?.name ? dest.name.split(",")[0].trim() : null);
          console.log(TAG, `Priority 1 check: active trip found? yes — destination="${city || "(no city parsed)"}"`);
          if (city && buildFromDestination(city)) {
            console.log(TAG, "Priority 1 RESOLVED — badge will show 'Exploring • " + city + "'");
            return;
          }
          p1Reason = "trip found but no city could be parsed";
        } else {
          console.log(TAG, "Priority 1 check: active trip found? no — Trip.list returned 0 records (guest or no saved trips)");
          p1Reason = "no saved trips (guest or new user)";
        }
      } catch (err) {
        console.log(TAG, "Priority 1 check: active trip found? no — Trip.list threw:", err?.message || err);
        p1Reason = `Trip.list threw: ${err?.message || err}`;
      }

      // ── Priority 2: Live Device GPS ──
      // Call getCurrentPosition() for BOTH "granted" and "prompt" states.
      // For "prompt" (first-time visitor), calling getCurrentPosition() IS what
      // triggers the browser's permission dialog — without this call, no prompt
      // ever appears and the cascade silently falls through to the fallback.
      const requestGps = () => {
        setUsingGps(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (!active) return;
            const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            if (!active) return;
            const label = city ? `Near You • ${city}` : "Near You";
            setLocationLabel(label);
            setActivity({
              place_name: city ? getPlaceName(city) : "Top Activity Nearby",
              image_url: DEFAULT_PLACE_IMAGE,
              rating: 4.7,
              distance_km: 1.2,
              category: "Must See",
            });
          },
          (err) => {
            // User denied the prompt, or GPS failed — fall back gracefully
            if (active) applyFallback();
          },
          { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
        );
      };

      let permState = "unavailable";
      const hasGeo = typeof navigator !== "undefined" && !!navigator.geolocation;

      if (hasGeo && navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: "geolocation" });
          if (!active) return;
          permState = perm.state;
          if (perm.state === "denied") {
            // Explicitly denied — don't re-prompt, fall through to Priority 3
          } else {
            // "granted" (immediate fix) or "prompt" (triggers browser dialog)
            requestGps();
            return; // GPS callback handles the rest
          }
        } catch {
          // Permissions query failed — try GPS directly
          requestGps();
          return;
        }
      } else if (hasGeo) {
        // No Permissions API but geolocation exists — try GPS directly (will prompt)
        requestGps();
        return;
      }

      // ── Priority 3: Fallback (featured destination) ──
      // Only reached if: Priority 1 had no trip, AND Priority 2 was "denied" or geolocation unavailable
      applyFallback();
    })();

    return () => { active = false; };
  }, []);

  if (!activity) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 w-full">
        <SectionHeader />
        <div className="w-full h-32 rounded-2xl bg-white border border-border animate-pulse" />
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12 w-full" aria-label="Nearby and live">
      <SectionHeader />

      <div
        className="relative w-full rounded-2xl border border-border/90 bg-white overflow-hidden shadow-[0_8px_28px_rgba(16,33,73,0.07)] lg:rounded-[2rem]"
      >
        {/* Subtle teal glow accent */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(8,120,209,0.12), transparent 70%)" }}
        />

        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center p-6 lg:p-8 xl:p-10">
          {/* Left side — text content (7 cols) */}
          <div className="md:col-span-7 order-2 md:order-1">
            {/* Location badge */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary border border-primary/20 text-[11px] font-semibold text-primary">
                <Navigation className="w-3 h-3" />
                {locationLabel}
              </span>
              {usingGps && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              )}
            </div>

            {/* Place title */}
            <h4 className="font-display text-lg sm:text-xl font-bold text-foreground leading-snug pr-2">
              {activity.place_name}
            </h4>

            {/* Context tags */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-border text-[11px] font-semibold text-foreground">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {activity.rating?.toFixed(1) ?? "—"}
              </span>
              {activity.distance_km != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-border text-[11px] font-semibold text-foreground">
                  <MapPin className="w-3 h-3 text-primary" /> {activity.distance_km} km away
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-semibold text-amber-300">
                <Sparkles className="w-3 h-3" /> {activity.category}
              </span>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => navigate("/nearby")}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Explore Nearby
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right side — feature image (5 cols) */}
          <div className="md:col-span-5 order-1 md:order-2">
            <img
              src={activity.image_url}
              alt={activity.place_name}
              loading="lazy"
              className="w-full h-48 md:h-56 lg:h-[300px] object-cover rounded-xl lg:rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2 lg:text-2xl">
        <MapPin className="w-5 h-5 text-primary" /> Nearby & Live
      </h3>
      <button
        type="button"
        onClick={() => (window.location.hash = "#/nearby")}
        className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:opacity-80 transition-opacity"
      >
        View all <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
