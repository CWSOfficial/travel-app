import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Plane, Train, Bus, Car, Ship, AlertCircle, Users, Baby, Sparkles, Map as MapIcon } from "lucide-react";
import JourneyMap from "@/components/multicity/JourneyMap";
import LocationAutocomplete from "@/components/travel/LocationAutocomplete";
import { Input } from "@/components/ui/input";
import {
  validateJourney,
  computeJourneyMetrics,
  computeJourneyIntelligence,
  splitLocation,
  daysBetween,
} from "@/lib/journeyContext";
import { detectUserCity } from "@/lib/geolocation";

const BUDGETS = [
  { value: "budget", label: "Budget", emoji: "💚" },
  { value: "mid_range", label: "Mid-Range", emoji: "✈️" },
  { value: "luxury", label: "Luxury", emoji: "💎" },
];

const STYLES = [
  { value: "beach", label: "Beach", emoji: "🏖️" },
  { value: "adventure", label: "Adventure", emoji: "🧗" },
  { value: "cultural", label: "Cultural", emoji: "🏛️" },
  { value: "relaxation", label: "Relaxation", emoji: "🧘" },
  { value: "mixed", label: "Mixed", emoji: "🌍" },
];

const GROUPS = [
  { value: "solo", label: "Solo", emoji: "🧍" },
  { value: "couple", label: "Couple", emoji: "👫" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { value: "group", label: "Group", emoji: "👥" },
];

const TRANSPORT = [
  { value: "flight", label: "Flight", icon: Plane },
  { value: "train", label: "Train", icon: Train },
  { value: "bus", label: "Bus", icon: Bus },
  { value: "car", label: "Car", icon: Car },
  { value: "ferry", label: "Ferry", icon: Ship },
];

const tomorrow = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().split("T")[0];
};

export default function MultiCityBuilder({ onGenerate, isGenerating, initialData }) {
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [stops, setStops] = useState([
    { destination: "", destination_city: "", destination_country: "", destination_country_code: "", destination_lat: null, destination_lng: null, mapbox_place_id: null, arrival_date: "", departure_date: "", transport_type: "flight", transport_notes: "" },
    { destination: "", destination_city: "", destination_country: "", destination_country_code: "", destination_lat: null, destination_lng: null, mapbox_place_id: null, arrival_date: "", departure_date: "", transport_type: "flight", transport_notes: "" },
  ]);
  const [travellers, setTravellers] = useState({
    group_type: "family",
    adults: 2,
    children: 0,
    child_ages: [],
    budget: "mid_range",
    travel_style: ["mixed"],
  });
  const [errors, setErrors] = useState([]);
  const [touched, setTouched] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [startCityCoords, setStartCityCoords] = useState(null);
  const [endCityCoords, setEndCityCoords] = useState(null);

  useEffect(() => {
    if (startCity) return;
    detectUserCity().then((city) => {
      if (city) setStartCity((c) => c || city);
    });
  }, []);

  // Prefill from existing journey data (Edit Journey mode).
  // Restores start/end cities, all segments in order, dates, transport,
  // traveller type, adults, children, child ages, budget, and travel styles.
  // Only fires when initialData changes (set once when "Edit Journey" is clicked).
  useEffect(() => {
    if (!initialData) return;
    if (initialData.startCity) setStartCity(initialData.startCity);
    if (initialData.endCity) setEndCity(initialData.endCity);
    if (initialData.segments?.length) {
      setStops(
        initialData.segments.map((s) => ({
          destination: s.destination || "",
          destination_city: s.destination_city || "",
          destination_country: s.destination_country || "",
          destination_country_code: s.destination_country_code || "",
          destination_lat: s.destination_lat || null,
          destination_lng: s.destination_lng || null,
          mapbox_place_id: s.mapbox_place_id || null,
          arrival_date: s.arrival_date || "",
          departure_date: s.departure_date || "",
          transport_type: s.transport_type || "flight",
          transport_notes: s.transport_notes || "",
        }))
      );
    }
    if (initialData.travellers) {
      const t = initialData.travellers;
      const childAges = Array.isArray(t.child_ages) ? t.child_ages : [];
      const children = childAges.length;
      const adults = Math.max(1, (t.num_travelers || t.adults || 2) - children);
      setTravellers((prev) => ({
        ...prev,
        group_type: t.group_type || prev.group_type,
        adults,
        children,
        child_ages: childAges,
        budget: t.budget || prev.budget,
        travel_style: Array.isArray(t.travel_style)
          ? t.travel_style
          : t.travel_style
            ? String(t.travel_style).split(", ")
            : prev.travel_style,
      }));
    }
  }, [initialData]);

  const setStop = (i, key, val) => {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));
  };

  // Update all structured destination fields at once when a destination is
  // selected from the global autocomplete (includes lat/lng/country from Mapbox).
  const setStopDestination = (i, dest) => {
    setStops((prev) => prev.map((s, idx) => (idx === i ? {
      ...s,
      destination: dest?.label || "",
      destination_city: dest?.city || "",
      destination_country: dest?.country || "",
      destination_country_code: dest?.country_code || "",
      destination_lat: dest?.lat || null,
      destination_lng: dest?.lng || null,
      mapbox_place_id: dest?.place_id || null,
    } : s)));
  };

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { destination: "", destination_city: "", destination_country: "", destination_country_code: "", destination_lat: null, destination_lng: null, mapbox_place_id: null, arrival_date: "", departure_date: "", transport_type: "flight", transport_notes: "" },
    ]);
  };

  const removeStop = (i) => {
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleStyle = (value) => {
    setTravellers((t) => {
      const cur = t.travel_style;
      if (cur.includes(value)) return { ...t, travel_style: cur.filter((v) => v !== value) };
      if (cur.length >= 3) return t;
      return { ...t, travel_style: [...cur, value] };
    });
  };

  // ── Functional traveller presets ──
  // Solo = 1 adult, 0 children (children disabled). Couple = 2 adults, 0 children
  // (children disabled). Family = ≥1 adult, children enabled. Group = ≥3 adults,
  // children optional. Counts and type never contradict each other.
  const applyGroupPreset = (value) => {
    setTravellers((t) => {
      const next = { ...t, group_type: value };
      if (value === "solo") {
        next.adults = 1;
        next.children = 0;
        next.child_ages = [];
      } else if (value === "couple") {
        next.adults = 2;
        next.children = 0;
        next.child_ages = [];
      } else if (value === "family") {
        next.adults = Math.max(1, t.adults);
        next.children = Math.max(0, t.children);
      } else if (value === "group") {
        next.adults = Math.max(3, t.adults);
      }
      return next;
    });
  };

  const incAdults = (delta) => {
    setTravellers((t) => {
      const adults = Math.max(1, Math.min(20, t.adults + delta));
      let group_type = t.group_type;
      // Solo → bump to group if adults exceeds 1; couple → group if exceeds 2;
      // group collapses back to couple/solo if adults drops below its minimum.
      if (t.group_type === "solo" && adults > 1) group_type = "group";
      else if (t.group_type === "couple" && adults > 2) group_type = "group";
      else if (t.group_type === "group" && adults < 3) group_type = adults === 2 ? "couple" : "solo";
      return { ...t, adults, group_type };
    });
  };

  const incChildren = (delta) => {
    setTravellers((t) => {
      const children = Math.max(0, Math.min(10, t.children + delta));
      let group_type = t.group_type;
      // Adding children while solo/couple switches to family (children not allowed for solo/couple).
      if (children > 0 && (t.group_type === "solo" || t.group_type === "couple")) group_type = "family";
      const child_ages = Array.from({ length: children }, (_, i) => (t.child_ages[i] != null ? t.child_ages[i] : 8));
      return { ...t, children, child_ages, group_type };
    });
  };

  const setChildAges = (count) => {
    setTravellers((t) => {
      const next = Array.from({ length: count }, (_, i) => (t.child_ages[i] != null ? t.child_ages[i] : 8));
      return { ...t, children: count, child_ages: next };
    });
  };

  const childrenDisabled = travellers.group_type === "solo" || travellers.group_type === "couple";

  // Build segment-shaped array for the intelligence helper (needs nights + city).
  const previewSegments = stops.map((s) => ({
    destination: s.destination,
    destination_city: splitLocation(s.destination).city,
    arrival_date: s.arrival_date,
    departure_date: s.departure_date,
    nights: s.arrival_date && s.departure_date ? Math.max(0, daysBetween(s.arrival_date, s.departure_date)) : 0,
  }));

  const metrics = computeJourneyMetrics({ stops });
  const intel = computeJourneyIntelligence(metrics, travellers, previewSegments);

  const handleStopClick = (i) => {
    setSelectedStop(i);
    const el = document.getElementById(`stop-card-${i}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleGenerate = () => {
    setTouched(true);
    const { valid, errors: errs } = validateJourney({ startCity, stops, endCity });
    setErrors(errs);
    if (!valid) return;

    const segments = stops.map((s, i) => {
      const { city, country } = splitLocation(s.destination);
      const nights =
        s.arrival_date && s.departure_date
          ? Math.max(0, Math.round((new Date(s.departure_date + "T00:00:00") - new Date(s.arrival_date + "T00:00:00")) / 86400000))
          : null;
      const origin = i === 0 ? splitLocation(startCity).city : splitLocation(stops[i - 1].destination).city;
      return {
        destination: s.destination.trim(),
        destination_full: s.destination.trim(),
        destination_city: s.destination_city || city,
        destination_country: s.destination_country || country,
        destination_country_code: s.destination_country_code || "",
        destination_lat: s.destination_lat || null,
        destination_lng: s.destination_lng || null,
        mapbox_place_id: s.mapbox_place_id || null,
        origin_city: origin,
        arrival_date: s.arrival_date,
        departure_date: s.departure_date,
        nights,
        transport_type: s.transport_type,
        transport_notes: s.transport_notes,
      };
    });

    onGenerate({
      startCity: startCity.trim(),
      endCity: (endCity || startCity).trim(),
      startDate: stops[0].arrival_date,
      endDate: stops[stops.length - 1].departure_date,
      metrics,
      pace: { label: intel.label, level: intel.level, warning: intel.warning },
      intelligence: intel,
      travellers: {
        ...travellers,
        num_travelers: Number(travellers.adults) + Number(travellers.children),
      },
      segments,
    });
  };

  const showErrors = touched && errors.length > 0;

  return (
    <div className="multicity-builder">
      {/* Mobile: collapsible map */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileMap((v) => !v)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 inline-flex items-center justify-center gap-2 min-h-[44px]"
        >
          <MapIcon className="w-4 h-4" /> {showMobileMap ? "Hide Map" : "View Journey Map"}
        </button>
        {showMobileMap && (
          <div className="mt-2 rounded-2xl border border-white/10 overflow-hidden h-[300px]">
            <JourneyMap stops={stops} startCity={startCity} endCity={endCity} startCityCoords={startCityCoords} endCityCoords={endCityCoords} selectedStop={selectedStop} onStopClick={handleStopClick} />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.8fr)] gap-5 lg:gap-7">
        <div className="space-y-5">
      <div className="text-center lg:rounded-[28px] lg:border lg:border-[#dfe8f3] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_68%,#e9f7fa_100%)] lg:px-7 lg:py-6 lg:text-left lg:shadow-[0_12px_34px_rgba(16,33,73,0.06)]">
        <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0878d1]">Plan a connected journey</p>
        <h2 className="text-xl md:text-2xl font-bold text-white lg:text-[32px] lg:leading-tight lg:tracking-[-0.04em]">🗺️ Multi-City Journey Builder</h2>
        <p className="text-xs text-slate-400 mt-1 lg:mt-2 lg:text-sm">One connected trip with ordered destination stops.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">🛫 Starting From</label>
          <LocationAutocomplete value={startCity} onChange={setStartCity} onSelectDestination={(d) => setStartCityCoords(d?.lat != null ? { lat: d.lat, lng: d.lng } : null)} placeholder="Bangalore, India…" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">🛬 Final Return To</label>
          <LocationAutocomplete value={endCity} onChange={setEndCity} onSelectDestination={(d) => setEndCityCoords(d?.lat != null ? { lat: d.lat, lng: d.lng } : null)} placeholder="Same as start or different…" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-300">Destinations in travel order</p>
        <AnimatePresence initial={false}>
          {stops.map((s, i) => (
            <motion.div
              key={i}
              id={`stop-card-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-2xl border bg-white/5 p-4 space-y-3 transition-all ${selectedStop === i ? "border-teal-500/40 ring-1 ring-teal-500/20" : "border-white/10"}`}
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">Destination {i + 1}</span>
                </div>
                {stops.length > 2 && (
                  <button onClick={() => removeStop(i)} className="text-slate-400 hover:text-red-400 p-1" aria-label="Remove destination">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <LocationAutocomplete value={s.destination} onChange={(v) => setStop(i, "destination", v)} onSelectDestination={(d) => setStopDestination(i, d)} placeholder="Paris, France…" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Arrival</label>
                  <Input type="date" min={tomorrow()} value={s.arrival_date} onChange={(e) => setStop(i, "arrival_date", e.target.value)} className="h-10 bg-white/5 border-white/10" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Departure</label>
                  <Input type="date" min={s.arrival_date || tomorrow()} value={s.departure_date} onChange={(e) => setStop(i, "departure_date", e.target.value)} className="h-10 bg-white/5 border-white/10" />
                </div>
              </div>

              {i < stops.length - 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 w-full">How will you travel to your next stop?</span>
                  {TRANSPORT.map((t) => {
                    const Icon = t.icon;
                    const active = s.transport_type === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setStop(i, "transport_type", t.value)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1 min-h-[36px] ${
                          active ? "border-teal-500/40 bg-teal-500/20 text-teal-300" : "border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={addStop}
          className="w-full rounded-2xl border border-dashed border-white/15 bg-white/5 py-3 text-sm text-slate-300 hover:border-teal-500/40 hover:text-teal-300 inline-flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> Add Destination
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <p className="text-sm font-semibold text-slate-200 inline-flex items-center gap-1.5">
          <Users className="w-4 h-4 text-teal-400" /> Travellers &amp; Preferences
        </p>

        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.value}
              onClick={() => applyGroupPreset(g.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium min-h-[40px] inline-flex items-center gap-1 ${
                travellers.group_type === g.value ? "border-teal-500/40 bg-teal-500/20 text-teal-300" : "border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Adults</p>
            <div className="flex items-center gap-2">
              <button onClick={() => incAdults(-1)} className="w-8 h-8 rounded-lg border border-white/10 text-slate-300">−</button>
              <span className="w-8 text-center font-bold text-white">{travellers.adults}</span>
              <button onClick={() => incAdults(1)} className="w-8 h-8 rounded-lg border border-white/10 text-slate-300">+</button>
            </div>
          </div>
          <div className={`rounded-xl border border-white/10 bg-white/5 p-3 transition-opacity ${childrenDisabled ? "opacity-40" : ""}`}>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 inline-flex items-center gap-1">
              <Baby className="w-3 h-3" /> Children
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => !childrenDisabled && incChildren(-1)}
                disabled={childrenDisabled}
                className="w-8 h-8 rounded-lg border border-white/10 text-slate-300 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="w-8 text-center font-bold text-white">{travellers.children}</span>
              <button
                onClick={() => !childrenDisabled && incChildren(1)}
                disabled={childrenDisabled}
                className="w-8 h-8 rounded-lg border border-white/10 text-slate-300 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            {childrenDisabled && (
              <p className="text-[10px] text-slate-500 mt-2">
                {travellers.group_type === "solo" ? "Solo trips are 1 adult." : "Couple trips are 2 adults."} Switch to Family or Group to add children.
              </p>
            )}
          </div>
        </div>

        {travellers.children > 0 && !childrenDisabled && (
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-400 w-full">Child ages:</span>
            {travellers.child_ages.slice(0, travellers.children).map((age, idx) => (
              <Input
                key={idx}
                type="number"
                min="0"
                max="17"
                value={age}
                onChange={(e) => setTravellers((t) => ({ ...t, child_ages: t.child_ages.map((a, i) => (i === idx ? Number(e.target.value) : a)) }))}
                className="h-9 w-16 bg-white/5 border-white/10"
                aria-label={`Child ${idx + 1} age`}
              />
            ))}
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Budget</p>
          <div className="flex gap-2">
            {BUDGETS.map((b) => (
              <button
                key={b.value}
                onClick={() => setTravellers((t) => ({ ...t, budget: b.value }))}
                className={`flex-1 py-2 rounded-xl border text-xs min-h-[40px] ${
                  travellers.budget === b.value ? "border-teal-500/40 bg-teal-500/20 text-teal-300" : "border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {b.emoji} {b.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Travel Style ({travellers.travel_style.length}/3)</p>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => {
              const active = travellers.travel_style.includes(s.value);
              const maxReached = travellers.travel_style.length >= 3;
              return (
                <button
                  key={s.value}
                  onClick={() => toggleStyle(s.value)}
                  className={`px-3 py-1.5 rounded-full border text-xs min-h-[36px] inline-flex items-center gap-1 ${
                    active ? "border-teal-500/40 bg-teal-500/20 text-teal-300" : maxReached ? "border-white/10 opacity-40" : "border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Journey Intelligence summary — deterministic, no AI */}
      {metrics.destinationCount > 0 && (
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-teal-300 inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Journey Intelligence
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
            <div>📅 <span className="text-slate-400">Duration</span><br /><span className="font-semibold text-white">{metrics.totalDays} days</span></div>
            <div>🌙 <span className="text-slate-400">Nights</span><br /><span className="font-semibold text-white">{metrics.totalNights}</span></div>
            <div>📍 <span className="text-slate-400">Destinations</span><br /><span className="font-semibold text-white">{metrics.destinationCount}</span></div>
            <div>✈️ <span className="text-slate-400">Transfers</span><br /><span className="font-semibold text-white">{metrics.transferLegs}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Pace:</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                intel.level === 0
                  ? "bg-emerald-500/20 text-emerald-300"
                  : intel.level === 1
                    ? "bg-teal-500/20 text-teal-300"
                    : intel.level === 2
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {intel.label}
            </span>
          </div>
          {intel.explanation && <p className="text-xs text-slate-200 leading-relaxed">{intel.explanation}</p>}
          {intel.bestFor && (
            <p className="text-xs text-slate-300">
              <span className="text-teal-300 font-semibold">Best for: </span>
              {intel.bestFor}
            </p>
          )}
          {intel.watchOut && (
            <p className="text-xs text-amber-300 inline-flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> <span><span className="font-semibold">Watch out: </span>{intel.watchOut}</span>
            </p>
          )}
        </div>
      )}

      {showErrors && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-300 inline-flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {e}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-primary-foreground font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] active:scale-[0.99] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating your journey…
          </>
        ) : (
          <>✨ Generate Connected Itinerary</>
        )}
      </button>
        </div>

        {/* Desktop: live journey map */}
        <div className="hidden lg:block sticky top-24 self-start rounded-[28px] border border-[#dfe8f3] bg-white p-3 shadow-[0_12px_34px_rgba(16,33,73,0.07)]">
          <div className="flex items-center justify-between gap-4 px-2 pb-3">
            <div><p className="text-sm font-bold text-[#102149]">Live route preview</p><p className="text-xs text-[#617084]">Select a stop to jump to its details</p></div>
            <MapIcon className="h-4 w-4 text-[#0878d1]" />
          </div>
          <JourneyMap stops={stops} startCity={startCity} endCity={endCity} startCityCoords={startCityCoords} endCityCoords={endCityCoords} selectedStop={selectedStop} onStopClick={handleStopClick} className="h-[600px] rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
