import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  MapPin, Search, Loader2, Hotel, Utensils, Camera, Compass,
  Crosshair, Info,
} from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import PlacesCardGrid from "@/components/PlacesCardGrid";
import ViatorWidget from "@/components/ViatorWidget";
import GetYourGuideWidget from "@/components/GetYourGuideWidget";
import HotelsWidget from "@/components/HotelsWidget";
import HotelsResultsGrid from "@/components/HotelsResultsGrid";
import GuestBanner from "@/components/auth/GuestBanner";
import { detectUserCity } from "@/lib/geolocation";

const CATEGORIES = [
  { id: "things_to_do", label: "Things To Do", icon: Compass },
  { id: "places", label: "Places", icon: Camera },
  { id: "food", label: "Food", icon: Utensils },
  { id: "stays", label: "Stays", icon: Hotel },
];

export default function Nearby() {
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(null); // { name, city, country }
  const [searchQ, setSearchQ] = useState("");
  const [activeCat, setActiveCat] = useState("things_to_do");
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const hasAutoSelected = useRef(false);
  const gpsAttempted = useRef(false);
  const urlDestApplied = useRef(false);

  // Pre-populate destination from ?destination= query param (e.g. Popular
  // Destinations cards on the home page). Takes priority over GPS/trip
  // auto-detection so the user lands on the destination they clicked.
  useEffect(() => {
    if (urlDestApplied.current) return;
    const dest = searchParams.get("destination");
    if (dest && dest.trim()) {
      urlDestApplied.current = true;
      hasAutoSelected.current = true;
      setDestination({
        name: dest,
        city: dest.split(",")[0].trim(),
        country: "",
      });
    }
  }, [searchParams]);

  // Load user's trips to find destination context
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["trips-for-nearby"],
    queryFn: async () => {
      try {
        const u = await base44.auth.me();
        if (!u) return [];
        return base44.entities.Trip.list("-created_date", 10);
      } catch { return []; }
    },
  });

  // Auto-detect destination on first load: target destination (most recent
  // trip) takes priority over the user's physical GPS location, so the page
  // always reflects the trip the user is planning — regardless of where they
  // are right now. GPS is only a last resort when no trip context exists.
  // hasAutoSelected lets the "Change →" button clear the destination without
  // this effect re-firing. gpsAttempted ensures GPS is only tried once.
  useEffect(() => {
    if (hasAutoSelected.current) return;
    // Wait for the trips query to settle before deciding — a pending query
    // looks like an empty list, which would prematurely fall through to GPS.
    if (tripsLoading) return;

    let cancelled = false;
    (async () => {
      // 1. Most recent trip destination — priority over GPS
      if (trips.length > 0) {
        const t = trips[0];
        const dest = t.destination_details || {};
        const name = t.selected_destination || dest.name || "";
        if (name) {
          hasAutoSelected.current = true;
          setDestination({
            name,
            city: dest.city || name.split(",")[0].trim(),
            country: t.destination_country || "",
          });
          return;
        }
      }

      // 2. GPS as a last resort (only once)
      if (!gpsAttempted.current) {
        gpsAttempted.current = true;
        setGpsDetecting(true);
        const gpsCity = await detectUserCity().catch(() => null);
        setGpsDetecting(false);
        if (cancelled) return;
        if (gpsCity) {
          hasAutoSelected.current = true;
          setDestination({ name: gpsCity, city: gpsCity.split(",")[0].trim(), country: "" });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [trips, tripsLoading]);

  const detectGps = async () => {
    setGpsDetecting(true);
    const city = await detectUserCity().catch(() => null);
    setGpsDetecting(false);
    if (city) {
      hasAutoSelected.current = true; // lock out auto-detect so a late-loading trip can't override the user's explicit GPS choice
      setDestination({ name: city, city: city.split(",")[0].trim(), country: "" });
      trackEvent("nearby_gps_detect", { destination: city });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchQ.trim();
    if (!term) return;
    hasAutoSelected.current = true; // lock out auto-detect so a late-loading trip can't override the user's search
    setDestination({
      name: term,
      city: term.split(",")[0].trim(),
      country: "",
    });
    setSearchQ("");
    trackEvent("nearby_destination_search", { destination: term });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 lg:pb-0">
      <Navbar />
      <main className="max-w-4xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <GuestBanner />
        {/* Header */}
        <div className="mb-5 lg:mb-8 lg:relative lg:isolate lg:overflow-hidden lg:flex lg:items-end lg:justify-between lg:gap-8 lg:rounded-[32px] lg:border lg:border-[#dce8f6] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_62%,#e6f6fa_100%)] lg:px-10 lg:py-9 lg:shadow-[0_20px_55px_rgba(16,33,73,0.08)] before:lg:absolute before:lg:-right-16 before:lg:-top-32 before:lg:-z-10 before:lg:h-96 before:lg:w-96 before:lg:rounded-full before:lg:bg-[radial-gradient(circle,rgba(61,222,254,0.22),rgba(61,222,254,0)_68%)]">
          <div className="relative z-10 max-w-3xl">
            <p className="hidden lg:inline-flex mb-4 items-center gap-2 rounded-full border border-[#cfe5f7] bg-white/80 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#005fa8] shadow-sm"><span className="h-2 w-2 rounded-full bg-[#00b7ad]" /> Geolocated sensory radar <span className="text-[#91a4bb]">•</span> Live discovery</p>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2 lg:block lg:text-[42px] lg:leading-[1.12] lg:tracking-[-0.045em]">
              <MapPin className="w-6 h-6 text-primary lg:hidden" /> Nearby <span className="hidden lg:inline">Discovery &amp; Curated Surroundings</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 lg:mt-4 lg:max-w-2xl lg:text-[15px] lg:leading-7">Real places, stays &amp; local experiences selected around your destination. Search a city or use your trip context to explore what is nearby.</p>
          </div>
          <div className="hidden lg:flex relative z-10 min-w-[230px] flex-col gap-2 rounded-2xl border border-white/90 bg-white/80 px-5 py-4 shadow-[0_8px_24px_rgba(16,33,73,0.07)] backdrop-blur">
            <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#617084]"><span className="h-2 w-2 rounded-full bg-[#00b7ad]" /> Location-aware</span>
            <span className="text-sm font-bold text-[#071a40]">{destination?.city || "Ready to explore"}</span>
            <span className="text-xs text-[#617084]">Live nearby discovery</span>
          </div>
        </div>

        {/* Destination bar — search always visible; "Exploring" label when set */}
        <div className="rounded-2xl lg:rounded-[28px] bg-white border border-border/80 p-4 lg:p-7 mb-5 lg:mb-7 shadow-[0_4px_18px_rgba(16,33,73,0.045)] lg:shadow-[0_16px_40px_rgba(16,33,73,0.08)]">
          {destination && (
            <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Exploring</p>
                  <p className="font-semibold text-sm truncate">{destination.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDestination(null)}
                className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors whitespace-nowrap min-h-[44px] inline-flex items-center px-1"
              >
                Change →
              </button>
            </div>
          )}
          {gpsDetecting && !destination ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              <span className="text-sm text-muted-foreground">Detecting your location…</span>
            </div>
          ) : (
            <div>
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 lg:left-4" />
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder={destination ? "Search a new destination…" : "e.g. Tokyo, Japan"}
                    className="w-full pl-9 pr-3 py-2.5 lg:pl-11 lg:pr-4 lg:py-4 lg:h-14 rounded-xl lg:rounded-2xl border border-border bg-muted/30 text-sm lg:text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <button type="submit" disabled={!searchQ.trim()} className="px-4 lg:px-7 py-2.5 lg:py-4 lg:h-14 rounded-xl lg:rounded-2xl bg-black text-white text-sm font-semibold shadow-sm hover:shadow-md transition-shadow disabled:opacity-50">
                  Go
                </button>
              </form>
              <button
                onClick={detectGps}
                disabled={gpsDetecting}
                className="mt-2 w-full lg:mt-0 lg:min-w-[220px] flex items-center justify-center gap-2 px-4 lg:px-5 py-2.5 lg:py-4 lg:h-14 rounded-xl lg:rounded-2xl border border-primary/25 bg-secondary text-primary text-sm font-semibold hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                <Crosshair className="w-4 h-4" />
                {gpsDetecting ? "Detecting…" : "Use my current location"}
              </button>
              </div>
              {trips.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Or pick from your trips:</p>
                  <div className="flex gap-2 flex-wrap">
                    {trips.slice(0, 4).map((t) => {
                      const dest = t.destination_details || {};
                      const name = t.selected_destination || dest.name || "";
                      return name ? (
                        <button
                          key={t.id}
                          onClick={() => {
                            hasAutoSelected.current = true; // lock out auto-detect
                            setDestination({ name, city: dest.city || name.split(",")[0].trim(), country: t.destination_country || "" });
                          }}
                          className="text-xs px-3 py-2.5 rounded-full border border-border bg-muted/70 hover:bg-secondary hover:border-primary/30 hover:text-primary transition-colors min-h-[44px] inline-flex items-center"
                        >
                          {name}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category tabs — always visible */}
        <div className="flex gap-2 mb-5 lg:mb-7 overflow-x-auto pb-1 lg:p-2 lg:rounded-2xl lg:border lg:border-white lg:bg-white/75 lg:shadow-[0_6px_22px_rgba(16,33,73,0.055)]" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`flex items-center gap-1.5 px-4 lg:px-6 py-2.5 lg:py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${active ? "bg-black text-white shadow-[0_4px_12px_rgba(8,120,209,0.24)]" : "bg-white border border-border/80 text-muted-foreground hover:text-primary hover:border-primary/25"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            );
          })}
        </div>

        {/* Category content — always rendered; auto-loads when destination is set */}
        <motion.div key={activeCat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeCat === "things_to_do" && (destination ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] gap-5 lg:gap-7 items-start">
                <div className="min-w-0 rounded-2xl lg:rounded-[28px] border border-border/80 bg-white p-4 lg:p-6 shadow-[0_8px_28px_rgba(16,33,73,0.055)]">
                  <PlacesCardGrid destination={destination} category="things_to_do" />
                </div>
                <aside className="min-w-0 space-y-5 lg:sticky lg:top-28">
                  <div className="rounded-2xl lg:rounded-[24px] border border-border/80 bg-white p-4 lg:p-5 shadow-[0_8px_28px_rgba(16,33,73,0.055)]">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Bookable experiences</p>
                    <ViatorWidget destination={destination} />
                  </div>
                  <div className="rounded-2xl lg:rounded-[24px] border border-border/80 bg-white p-4 lg:p-5 shadow-[0_8px_28px_rgba(16,33,73,0.055)]">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">More local tours</p>
                    <GetYourGuideWidget destination={destination} />
                  </div>
                </aside>
              </div>
              <div className="flex items-start gap-1.5 px-1 pt-1">
                <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Activity booking links are affiliate links via Viator and GetYourGuide — DheeVoy may earn a commission. Always verify pricing on the partner's site.
                </p>
              </div>
            </div>
          ) : <NoDestinationPrompt />)}
          {activeCat === "places" && (destination ? <PlacesCardGrid destination={destination} category="places" /> : <NoDestinationPrompt />)}
          {activeCat === "food" && (destination ? <PlacesCardGrid destination={destination} category="food" /> : <NoDestinationPrompt />)}
          {activeCat === "stays" && (destination ? (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] gap-5 lg:gap-7 items-start">
                <div className="min-w-0 rounded-2xl lg:rounded-[28px] border border-border/80 bg-white p-4 lg:p-6 shadow-[0_8px_28px_rgba(16,33,73,0.055)]">
                  <HotelsResultsGrid destination={destination} />
                </div>
                <div className="min-w-0 rounded-2xl lg:rounded-[24px] border border-border/80 bg-white p-4 lg:p-5 shadow-[0_8px_28px_rgba(16,33,73,0.055)]">
                <p className="text-xs text-center text-muted-foreground mb-2">
                  Or search manually with specific dates:
                </p>
                <HotelsWidget destination={destination} />
                </div>
              </div>
            </div>
          ) : <NoDestinationPrompt />)}
        </motion.div>
      </main>
      <BottomNav active="/nearby" />
    </div>
  );
}

/* ── No destination prompt — shown in content area when no destination is set ── */
function NoDestinationPrompt() {
  return (
    <div className="text-center py-12 lg:py-20 lg:rounded-[28px] lg:border lg:border-border/80 lg:bg-white lg:shadow-[0_8px_28px_rgba(16,33,73,0.055)]">
      <MapPin className="w-10 h-10 text-primary/35 mx-auto mb-3" />
      <p className="text-sm lg:text-base text-muted-foreground">
        Search a destination above or use your current location to explore nearby places, food & stays.
      </p>
    </div>
  );
}
