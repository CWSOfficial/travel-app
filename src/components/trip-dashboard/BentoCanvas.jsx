import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import LocationAutocomplete from "@/components/travel/LocationAutocomplete";
import { detectUserCity } from "@/lib/geolocation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import { trackMetaPixel } from "@/lib/metaPixel";
import { trackViewContent, trackSearch } from "@/lib/metaCapi";
import {
  MapPin, Globe, Sparkles, Shuffle, Search, Loader2, Plane,
} from "lucide-react";

const BUDGETS = [
  { value: "budget", label: "Budget", desc: "Affordable", emoji: "💚" },
  { value: "mid_range", label: "Mid-Range", desc: "Best value", emoji: "✈️" },
  { value: "luxury", label: "Luxury", desc: "Premium", emoji: "💎" },
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
];

export default function BentoCanvas({ onBuild, isLoading }) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState("known"); // default to known — single screen
  const [form, setForm] = useState({
    departure_city: "",
    destination_preference: "",
    start_date: "",
    end_date: "",
    budget: "mid_range",
    travel_style: ["mixed"], // multi-select array (max 3)
    group_type: "solo",
    num_travelers: 1,
    passport_country: "",
  });
  const [dateError, setDateError] = useState("");
  const [locDetected, setLocDetected] = useState(false);
  const [passportDetected, setPassportDetected] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ── Travel style: multi-select toggle (max 3) ──
  const toggleStyle = (value) => {
    setForm((f) => {
      const current = f.travel_style;
      if (current.includes(value)) {
        // Deselect
        return { ...f, travel_style: current.filter((v) => v !== value) };
      }
      if (current.length >= 3) {
        toast({ title: "Max 3 styles", description: "Deselect one to add another." });
        return f;
      }
      return { ...f, travel_style: [...current, value] };
    });
  };

  // ── Smart Auto-Fill: departure city via geolocation/IP ──
  useEffect(() => {
    if (form.departure_city) return;
    detectUserCity().then((city) => {
      if (city) {
        setForm((f) => (f.departure_city ? f : { ...f, departure_city: city }));
        setLocDetected(true);
      }
    });
  }, []);

  // ── Smart Auto-Fill: passport country from profile or IP ──
  useEffect(() => {
    if (form.passport_country) return;
    // 1. Logged-in user's profile country_code
    if (user?.country_code) {
      setForm((f) => (f.passport_country ? f : { ...f, passport_country: user.country_code }));
      setPassportDetected(true);
      return;
    }
    // 2. IP-based country lookup
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.country_name) {
          setForm((f) => (f.passport_country ? f : { ...f, passport_country: d.country_name }));
          setPassportDetected(true);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleDateChange = (val) => {
    if (val && val < tomorrowStr) {
      setDateError("Start date must be at least tomorrow.");
    } else {
      setDateError("");
    }
    set("start_date", val);
  };

  const durationDays =
    form.start_date && form.end_date
      ? Math.max(1, Math.round((new Date(form.end_date + "T00:00:00") - new Date(form.start_date + "T00:00:00")) / 86400000))
      : 0;

  const canBuild =
    form.departure_city &&
    form.start_date &&
    !dateError &&
    form.end_date &&
    form.budget &&
    form.travel_style.length > 0 &&
    form.group_type &&
    (mode === "suggest" || form.destination_preference);

  const handleBuild = () => {
    if (!canBuild) return;
    trackEvent("trip_dashboard_build", { mode, destination: form.destination_preference || "suggest", styles: form.travel_style.join(",") });
    // trip_started Key Event — fires here (reachable build with real trip data) since the
    // legacy VIEWS.HERO path in Home.jsx is no longer linked from any live UI element.
    trackEvent("trip_started", {
      destination: form.destination_preference || "",
      date_range: form.start_date && form.end_date ? `${form.start_date} to ${form.end_date}` : (form.start_date || ""),
      travel_style: Array.isArray(form.travel_style) ? form.travel_style.join(", ") : (form.travel_style || ""),
    });
    // Meta Pixel mirror of the trip_started GA4 Key Event (consent-gated)
    trackMetaPixel("TripStarted", {
      destination: form.destination_preference || "",
      date_range: form.start_date && form.end_date ? `${form.start_date} to ${form.end_date}` : (form.start_date || ""),
      travel_style: Array.isArray(form.travel_style) ? form.travel_style.join(", ") : (form.travel_style || ""),
    });
    onBuild({
      ...form,
      travel_style: form.travel_style.join(", "), // array → comma-separated string for LLM
      mode,
      duration_days: durationDays,
      num_travelers: parseInt(form.num_travelers),
    });
    // ViewContent — meaningful personalised content (itinerary) generated
    trackViewContent("itinerary", form.destination_preference || null, { pillar: "PLAN" });
  };

  return (
    <div className="max-w-5xl lg:max-w-7xl mx-auto px-4 py-8 lg:px-8 lg:py-12">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-9 lg:rounded-[32px] lg:border lg:border-[#dfe8f3] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_68%,#e9f7fa_100%)] lg:px-10 lg:py-9 lg:shadow-[0_18px_48px_rgba(16,33,73,0.07)]">
        <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0878d1]">Build a trip around you</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight lg:text-[40px] lg:leading-tight lg:tracking-[-0.045em] lg:text-[#071a40]">
          ✨ Create Your Journey
        </h2>
        <p className="text-xs md:text-sm text-slate-400 mt-1 lg:mt-2 lg:text-base lg:text-[#617084]">
          One screen. Real-time visas, safety, and instant itineraries.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 lg:rounded-2xl lg:border-white lg:bg-white lg:p-1.5 lg:shadow-[0_7px_22px_rgba(16,33,73,0.06)]">
          <button
            onClick={() => setMode("known")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] inline-flex items-center gap-1.5 ${
              mode === "known" ? "bg-teal-500/20 border border-teal-500/30 text-teal-300 lg:border-[#cfe5f7] lg:bg-[#eaf7ff] lg:text-[#0878d1]" : "text-slate-300 hover:bg-white/10 lg:text-[#617084] lg:hover:bg-[#f5faff]"
            }`}
          >
            <Search className="w-4 h-4" /> I know where
          </button>
          <button
            onClick={() => setMode("suggest")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] inline-flex items-center gap-1.5 ${
              mode === "suggest" ? "bg-teal-500/20 border border-teal-500/30 text-teal-300 lg:border-[#cfe5f7] lg:bg-[#eaf7ff] lg:text-[#0878d1]" : "text-slate-300 hover:bg-white/10 lg:text-[#617084] lg:hover:bg-[#f5faff]"
            }`}
          >
            <Shuffle className="w-4 h-4" /> Surprise me
          </button>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 lg:gap-4">
        {/* Destination — large cell (spans 2 cols, 2 rows on desktop) */}
        {mode === "known" && (
          <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between focus-within:border-teal-400/50 transition-all lg:rounded-[26px] lg:border-[#dfe8f3] lg:bg-white lg:p-7 lg:shadow-[0_10px_30px_rgba(16,33,73,0.055)]">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5 lg:text-[#617084]">
                📍 Where To?
              </label>
              <LocationAutocomplete
                value={form.destination_preference}
                onChange={(val) => set("destination_preference", val)}
                onSelect={(val) => trackSearch(val, "PLAN")}
                placeholder="e.g. Bali, Paris, Tokyo…"
              />
              <p className="text-xs text-slate-400 mt-2 lg:text-[#617084]">We'll check visa & safety for this spot.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 mt-4 text-xs text-slate-400 lg:text-[#617084]">
              <Plane className="w-3.5 h-3.5 text-teal-400" /> Direct deep-links to flights & stays below.
            </div>
          </div>
        )}

        {/* Departing from */}
        <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 focus-within:border-teal-400/50 transition-all lg:rounded-[24px] lg:border-[#dfe8f3] lg:bg-white lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)] ${mode === "suggest" ? "md:col-span-2" : ""}`}>
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5 lg:text-[#617084]">
            🛫 Departing From
          </label>
          <LocationAutocomplete
            value={form.departure_city}
            onChange={(val) => { set("departure_city", val); setLocDetected(false); }}
            placeholder="London, New York…"
          />
          {locDetected && (
            <p className="text-[11px] text-teal-400 flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3" /> Auto-detected — change if needed
            </p>
          )}
        </div>

        {/* Passport country */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 focus-within:border-teal-400/50 transition-all lg:rounded-[24px] lg:border-[#dfe8f3] lg:bg-white lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5 lg:text-[#617084]">
            🛂 Passport
          </label>
          <LocationAutocomplete
            value={form.passport_country}
            onChange={(val) => set("passport_country", val)}
            placeholder="United Kingdom…"
            countriesOnly
          />
          {passportDetected && (
            <p className="text-[11px] text-teal-400 flex items-center gap-1 mt-1.5">
              <Globe className="w-3 h-3" /> Auto-filled from your location
            </p>
          )}
        </div>

        {/* Dates — wide cell */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 focus-within:border-teal-400/50 transition-all lg:rounded-[24px] lg:border-[#dfe8f3] lg:bg-white lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5 lg:text-[#617084]">
            📅 Travel Dates
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                min={tomorrowStr}
                value={form.start_date}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`h-11 rounded-lg border-white/10 bg-white/5 lg:border-[#dbe4ef] lg:bg-[#f8faff] lg:[color-scheme:light] ${dateError ? "border-red-400" : ""}`}
              />
              <p className="text-[10px] text-slate-400 mt-1 lg:text-[#617084]">Start</p>
            </div>
            <div>
              <Input
                type="date"
                min={form.start_date || tomorrowStr}
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="h-11 rounded-lg border-white/10 bg-white/5 lg:border-[#dbe4ef] lg:bg-[#f8faff] lg:[color-scheme:light]"
              />
              <p className="text-[10px] text-slate-400 mt-1 lg:text-[#617084]">
                End{durationDays > 0 ? ` · ${durationDays} days` : ""}
              </p>
            </div>
          </div>
          {dateError && <p className="text-[11px] text-red-400 font-medium mt-1">{dateError}</p>}
        </div>

        {/* Budget */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 lg:rounded-[24px] lg:border-[#dfe8f3] lg:bg-white lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-2 lg:text-[#617084]">
            💰 Budget Preference
          </label>
          <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 lg:border-[#e4e9f2] lg:bg-[#f8faff]">
            {BUDGETS.map((b) => (
              <button
                key={b.value}
                onClick={() => set("budget", b.value)}
                className={`py-2.5 text-xs rounded-xl transition-all min-h-[44px] ${
                  form.budget === b.value
                    ? "font-semibold text-teal-300 bg-teal-500/20 border border-teal-500/30 lg:border-[#b9ddf5] lg:bg-[#eaf7ff] lg:text-[#0878d1]"
                    : "font-medium text-slate-300 hover:bg-white/10 lg:text-[#617084] lg:hover:bg-white"
                }`}
              >
                {b.emoji} {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Travel style — multi-select (up to 3) */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 lg:rounded-[24px] lg:border-[#dfe8f3] lg:bg-white lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
          <div className="flex items-center mb-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold lg:text-[#617084]">
              🧭 Travel Style
            </label>
            <span className="ml-auto text-[10px] text-slate-400 font-normal lg:text-[#617084]">
              {form.travel_style.length}/3 selected
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => {
              const isActive = form.travel_style.includes(s.value);
              const maxReached = form.travel_style.length >= 3;
              return (
                <button
                  key={s.value}
                  onClick={() => toggleStyle(s.value)}
                  className={`px-3 py-2 rounded-full border text-xs font-medium transition-all min-h-[44px] inline-flex items-center gap-1 ${
                    isActive
                      ? "border-teal-500/30 bg-teal-500/20 text-teal-300 lg:border-[#b9ddf5] lg:bg-[#eaf7ff] lg:text-[#0878d1]"
                      : maxReached
                        ? "border-white/10 opacity-40 cursor-not-allowed"
                        : "border-white/10 text-slate-300 hover:bg-white/10 lg:border-[#dbe4ef] lg:text-[#617084] lg:hover:bg-[#f8faff]"
                  }`}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Group type */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 lg:rounded-[24px] lg:border-[#dfe8f3] lg:bg-white lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-2 lg:text-[#617084]">
            👥 Who's Travelling?
          </label>
          <div className="flex gap-2">
            {GROUPS.map((g) => (
              <button
                key={g.value}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    group_type: g.value,
                    num_travelers: g.value === "solo" ? 1 : g.value === "couple" ? 2 : Math.max(2, f.num_travelers),
                  }))
                }
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] inline-flex items-center justify-center gap-1.5 ${
                  form.group_type === g.value
                    ? "border-teal-500/30 bg-teal-500/20 text-teal-300 lg:border-[#b9ddf5] lg:bg-[#eaf7ff] lg:text-[#0878d1]"
                    : "border-white/10 text-slate-300 hover:bg-white/10 lg:border-[#dbe4ef] lg:text-[#617084] lg:hover:bg-[#f8faff]"
                }`}
              >
                <span>{g.emoji}</span> {g.label}
              </button>
            ))}
          </div>
          {form.group_type === "family" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400 lg:text-[#617084]">Travellers:</span>
              <Input
                type="number"
                min="2"
                max="20"
                value={form.num_travelers}
                onChange={(e) => set("num_travelers", e.target.value)}
                className="h-9 rounded-lg w-20 border-white/10 bg-white/5 lg:border-[#dbe4ef] lg:bg-[#f8faff]"
              />
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={handleBuild}
          disabled={!canBuild || isLoading}
          className="w-full max-w-md h-14 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-primary-foreground font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2 lg:max-w-sm lg:bg-gradient-to-r lg:from-[#0878d1] lg:to-[#35c8ed] lg:shadow-[0_12px_28px_rgba(8,120,209,0.22)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Building your plan…
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Build My Live Trip Plan
            </>
          )}
        </button>
        <p className="text-xs text-slate-400 lg:text-[#617084]">
          {isAuthenticated ? "Saved to your profile automatically." : "No sign-up needed to preview — save later."}
        </p>
      </div>
    </div>
  );
}
