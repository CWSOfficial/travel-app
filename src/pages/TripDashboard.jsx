import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getCurrencyFromCity } from "@/lib/currency";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { buildItineraryPrompt, ITINERARY_RESPONSE_SCHEMA } from "@/lib/itineraryGenerator";
import { saveDashboardState, loadDashboardState, clearDashboardState } from "@/lib/tripDashboardStorage";
import { useAuth } from "@/lib/AuthContext";

import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import BentoCanvas from "@/components/trip-dashboard/BentoCanvas";
import CommandCenter from "@/components/trip-dashboard/CommandCenter";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function TripDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [phase, setPhase] = useState("canvas"); // canvas | results | command
  const [preferences, setPreferences] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [readiness, setReadiness] = useState({});
  const [tripId, setTripId] = useState(null);

  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState(null);
  const [swappingSpot, setSwappingSpot] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const restoredRef = useRef(false);
  const itineraryStartedRef = useRef(false);

  // ── On mount: restore from ?trip= param or localStorage draft ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const tripParam = searchParams.get("trip");
    if (tripParam) {
      loadSavedTrip(tripParam);
      return;
    }

    const draft = loadDashboardState();
    if (draft && draft.selectedDest && draft.preferences) {
      setPreferences(draft.preferences);
      setSelectedDest(draft.selectedDest);
      setItinerary(draft.itinerary || []);
      setReadiness(draft.readiness || {});
      setTripId(draft.tripId || null);
      setPhase("command");
    }
  }, []);

  // ── Auto-save to localStorage on every state change ──
  useEffect(() => {
    if (phase === "canvas" && !selectedDest) return;
    saveDashboardState({ phase, preferences, recommendations, selectedDest, itinerary, readiness, tripId });
  }, [phase, preferences, recommendations, selectedDest, itinerary, readiness, tripId]);

  // ── Pending action: auto-complete after guest sign-in redirect ──
  useEffect(() => {
    if (phase === "command" && isAuthenticated && !pendingAction) {
      const pending = sessionStorage.getItem("dheevoy_pending_action");
      if (pending) {
        sessionStorage.removeItem("dheevoy_pending_action");
        setPendingAction(pending);
      }
    }
  }, [phase, isAuthenticated, pendingAction]);

  // ── Load a saved trip from DB → jump to command phase ──
  const loadSavedTrip = async (id) => {
    try {
      const trip = await base44.entities.Trip.get(id);
      const prefs = {
        departure_city: trip.departure_city,
        start_date: trip.start_date,
        duration_days: trip.duration_days,
        budget: trip.budget,
        travel_style: trip.travel_style,
        group_type: trip.group_type,
        num_travelers: trip.num_travelers || 1,
        email: trip.email,
        mode: "known",
      };
      const dest = trip.destination_details || { name: trip.selected_destination };
      setPreferences(prefs);
      setSelectedDest(dest);
      setTripId(trip.id);
      setPhase("command");
    } catch {
      setPhase("canvas");
    }
  };

  // ── Build: run recommendation LLM, then route ──
  const handleBuild = async (prefs) => {
    setPreferences(prefs);
    setError(null);
    setIsGeneratingRecs(true);

    // Known mode: render Command Center shell INSTANTLY with minimal dest, fill details when LLM returns
    if (prefs.mode === "known" && prefs.destination_preference) {
      setSelectedDest({ name: prefs.destination_preference, city: prefs.destination_preference.split(",")[0].trim() });
      setPhase("command");
      setRecommendations([]);
    } else {
      setPhase("results");
    }

    try {
      const currency = getCurrencyFromCity(prefs.departure_city);
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "destinations",
        input: {
          mode: prefs.mode,
          destination_preference: prefs.destination_preference,
          departure_city: prefs.departure_city,
          start_date: prefs.start_date,
          duration_days: prefs.duration_days,
          budget: prefs.budget,
          travel_style: prefs.travel_style,
          group_type: prefs.group_type,
          num_travelers: prefs.num_travelers,
          passport_country: prefs.passport_country,
          currency_code: currency.code,
        },
      });
      const result = res.data;

      const dests = result.destinations || [];
      setRecommendations(dests);
      setIsGeneratingRecs(false);

      if (prefs.mode === "known") {
        // Merge full details into the shell dest
        const match = dests[0];
        if (match) setSelectedDest((d) => ({ ...match, ...d, name: d.name || match.name }));
      }
    } catch (err) {
      setIsGeneratingRecs(false);
      setError("Couldn't generate recommendations. Please try again.");
      if (prefs.mode === "known") setPhase("canvas");
    }
  };

  // ── Suggest mode: user picks a destination card ──
  const handleSelectDest = (dest) => {
    setSelectedDest(dest);
    setPhase("command");
    trackEvent("dashboard_dest_selected", { destination: dest.name });
  };

  // ── Auto-generate itinerary when Command Center mounts (background, no full-screen spinner) ──
  useEffect(() => {
    if (phase === "command" && selectedDest && preferences && !itineraryStartedRef.current && itinerary.length === 0) {
      itineraryStartedRef.current = true;
      generateItinerary();
    }
  }, [phase, selectedDest, preferences]);

  const generateItinerary = async () => {
    setIsGeneratingItinerary(true);
    try {
      const trip = {
        selected_destination: selectedDest.name,
        departure_city: preferences.departure_city,
        start_date: preferences.start_date,
        duration_days: preferences.duration_days,
        travel_style: preferences.travel_style,
        group_type: preferences.group_type,
        num_travelers: preferences.num_travelers,
        budget: preferences.budget,
      };
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "itinerary",
        input: { trip },
      });
      const result = res.data;
      setItinerary(result.days || []);
      // Auto-check visa readiness once we have visa data
      if (selectedDest?.visa_requirement) {
        setReadiness((r) => ({ ...r, visa: true }));
      }
    } catch {
      setError("Couldn't generate itinerary. Try regenerating a day.");
    }
    setIsGeneratingItinerary(false);
  };

  // ── Regenerate a single day ──
  const handleRegenerateDay = async (dayIdx) => {
    setRegeneratingDay(dayIdx);
    try {
      const day = itinerary[dayIdx];
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "regenerate_day",
        input: { dayIdx, destinationName: selectedDest.name, prevTheme: day?.theme || "", travelStyle: preferences.travel_style, budget: preferences.budget },
      });
      const result = res.data;
      setItinerary((days) => days.map((d, i) => (i === dayIdx ? result : d)));
      trackEvent("dashboard_day_regenerated", { day: dayIdx + 1 });
    } catch {
      toast({ title: "Couldn't regenerate that day", description: "Please try again.", variant: "destructive" });
    }
    setRegeneratingDay(null);
  };

  // ── Swap a single activity spot ──
  const handleSwapSpot = async (dayIdx, slot, currentActivity) => {
    setSwappingSpot({ dayIdx, slot });
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "alternative_activity",
        input: { slot, destinationName: selectedDest.name, currentActivityTitle: currentActivity.title, travelStyle: preferences.travel_style, budget: preferences.budget },
      });
      const result = res.data;
      setItinerary((days) =>
        days.map((d, i) => {
          if (i !== dayIdx) return d;
          const newSlot = [...(d[slot] || [])];
          newSlot[0] = result;
          return { ...d, [slot]: newSlot };
        })
      );
      trackEvent("dashboard_spot_swapped", { day: dayIdx + 1, slot });
    } catch {
      toast({ title: "Couldn't swap that spot", description: "Please try again.", variant: "destructive" });
    }
    setSwappingSpot(null);
  };

  // ── Readiness toggles ──
  const handleToggleReadiness = (id) => {
    setReadiness((r) => ({ ...r, [id]: !r[id] }));
  };
  const handleReadinessAction = (id) => {
    if (id === "esim") {
      window.open("https://cellesim.com/r/dheevoy-limited-rze", "_blank", "noopener,noreferrer");
      setReadiness((r) => ({ ...r, esim: true }));
    } else if (id === "pack") {
      const tripDetails = {
        selected_destination: selectedDest?.name,
        departure_city: preferences?.departure_city,
        start_date: preferences?.start_date,
        duration_days: preferences?.duration_days,
        travel_style: preferences?.travel_style,
        group_type: preferences?.group_type,
        budget: preferences?.budget,
      };
      navigate(`/travel-checklist${tripId ? `?trip=${tripId}` : ""}`, { state: { tripDetails } });
    }
  };
  const handleAffiliateClick = (context) => {
    // Auto-check readiness when user engages with booking
    if (context === "flight") setReadiness((r) => ({ ...r, flight: true }));
    if (context === "hotel") setReadiness((r) => ({ ...r, stay: true }));
  };

  // ── Save trip to DB ──
  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      const tripData = {
        departure_city: preferences.departure_city,
        start_date: preferences.start_date,
        duration_days: preferences.duration_days,
        budget: preferences.budget,
        travel_style: preferences.travel_style,
        group_type: preferences.group_type,
        num_travelers: preferences.num_travelers,
        selected_destination: selectedDest.name,
        destination_details: selectedDest,
        recommendations,
        status: "planning",
        trip_type: "self_planned",
      };
      const result = await base44.functions.invoke("saveTrip", tripId ? { trip_data: tripData, trip_id: tripId } : { trip_data: tripData });
      setTripId(result.data.trip.id);
      trackEvent("dashboard_trip_saved", { destination: selectedDest.name });
      toast({ title: "Trip saved! 💾", description: `Your trip to ${selectedDest.name} is in your profile.` });
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleStartOver = () => {
    clearDashboardState();
    setSearchParams({}, { replace: true });
    setPhase("canvas");
    setPreferences(null);
    setRecommendations([]);
    setSelectedDest(null);
    setItinerary([]);
    setReadiness({});
    setTripId(null);
    setError(null);
    itineraryStartedRef.current = false;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 lg:bg-[linear-gradient(180deg,#f2f6ff_0%,#faf8ff_42%,#f7fbff_100%)]">
      <Navbar />

      <AnimatePresence mode="wait">
        {phase === "canvas" && (
          <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BentoCanvas onBuild={handleBuild} isLoading={isGeneratingRecs} />
          </motion.div>
        )}

        {phase === "results" && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl lg:max-w-7xl mx-auto px-4 py-10 lg:px-8 lg:py-12">
            <button onClick={() => setPhase("canvas")} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 min-h-[44px]">
              <ArrowLeft className="w-4 h-4" /> Adjust inputs
            </button>
            <div className="text-center mb-8 lg:rounded-[28px] lg:border lg:border-[#dfe8f3] lg:bg-white/85 lg:px-8 lg:py-7 lg:shadow-[0_12px_34px_rgba(16,33,73,0.06)]">
              <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0878d1]">AI destination matches</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold lg:text-[34px] lg:tracking-[-0.04em]">Top 3 Picks For You</h2>
              <p className="text-muted-foreground mt-1 text-sm">From {preferences?.departure_city} · {preferences?.duration_days} days</p>
            </div>
            {isGeneratingRecs && recommendations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">Finding your perfect matches…</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((dest, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectDest(dest)}
                    className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all lg:min-h-52 lg:rounded-[24px] lg:border-[#e1e9f2] lg:p-6 lg:shadow-[0_8px_24px_rgba(16,33,73,0.055)] lg:hover:-translate-y-1 lg:hover:shadow-[0_18px_34px_rgba(16,33,73,0.1)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm">{dest.name}</h3>
                      <span className="text-xs font-bold text-primary">{dest.safety_index_score}/100</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{dest.why_recommended}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-muted">{dest.visa_requirement}</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-muted">{dest.total_cost}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {phase === "command" && selectedDest && (
          <motion.div key="command" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="max-w-5xl lg:max-w-7xl mx-auto px-4 pt-4 lg:px-8 lg:pt-7">
              <button onClick={handleStartOver} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 min-h-[44px]">
                <ArrowLeft className="w-4 h-4" /> Start a new trip
              </button>
            </div>
            <CommandCenter
              destination={selectedDest}
              preferences={preferences}
              itinerary={itinerary}
              isGeneratingItinerary={isGeneratingItinerary}
              regeneratingDay={regeneratingDay}
              swappingSpot={swappingSpot}
              readiness={readiness}
              tripId={tripId}
              isSaving={isSaving}
              onRegenerateDay={handleRegenerateDay}
              onSwapSpot={handleSwapSpot}
              onToggleReadiness={handleToggleReadiness}
              onReadinessAction={handleReadinessAction}
              onAffiliateClick={handleAffiliateClick}
              onSaveTrip={handleSaveTrip}
              pendingAction={pendingAction}
              onPendingDone={() => setPendingAction(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && phase === "canvas" && (
        <div className="max-w-xl mx-auto px-4 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
        </div>
      )}

      <BottomNav active="/plan" />
    </div>
  );
}
