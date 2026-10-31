import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, ChevronRight, Sparkles, Loader2,
  Sun, Camera, Sunset, Info, Hotel, ChevronDown, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import { buildItineraryPrompt, ITINERARY_RESPONSE_SCHEMA } from "@/lib/itineraryGenerator";
import ItinerarySkeleton from "@/components/travel/ItinerarySkeleton";

const TIME_ICONS = { morning: Sun, afternoon: Camera, evening: Sunset };
const TIME_COLORS = {
  morning: "bg-amber-50 border-amber-200 text-amber-700",
  afternoon: "bg-sky-50 border-sky-200 text-sky-700",
  evening: "bg-orange-50 border-orange-200 text-orange-700",
};

function ItineraryDay({ day, dayNum, startDate, isOpen, onToggle }) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNum - 1);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold leading-none">Day</span>
            <span className="text-sm font-black leading-none">{dayNum}</span>
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">{day.theme || `Day ${dayNum}`}</p>
            <p className="text-xs text-muted-foreground">{format(date, "EEE, dd MMM")}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
        >
          <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-3">
            {["morning", "afternoon", "evening"].map(period => {
              const activities = day[period] || [];
              if (!activities.length) return null;
              const Icon = TIME_ICONS[period];
              return (
                <div key={period} className={`rounded-lg border p-2.5 ${TIME_COLORS[period]}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold capitalize">{period}</span>
                  </div>
                  <div className="space-y-1.5">
                    {activities.map((act, i) => (
                      <div key={i} className="bg-card/60 rounded-md p-2">
                        <p className="text-xs font-semibold text-foreground">{act.title}</p>
                        {act.description && <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>}
                        {act.cost && <p className="text-xs font-bold mt-0.5">💰 {act.cost}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {day.accommodation && (
              <div className="flex items-start gap-2 p-2.5 bg-muted rounded-lg">
                <Hotel className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Stay</p>
                  <p className="text-xs text-muted-foreground">{day.accommodation}</p>
                </div>
              </div>
            )}
            {day.tips && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">{day.tips}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function TripCostSummary({ destination, preferences, onBack, onContinue }) {
  const [itinerary, setItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [itineraryError, setItineraryError] = useState(null);
  const [openDay, setOpenDay] = useState(1);
  const [statusIndex, setStatusIndex] = useState(0);

  const endDate = (() => {
    const d = new Date(preferences.start_date);
    d.setDate(d.getDate() + parseInt(preferences.duration_days));
    return d.toISOString().split("T")[0];
  })();

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Itinerary is generated ON-DEMAND (button click) — not auto-generated on mount.
  // This lets the cost summary page render instantly without waiting 20-30s for the LLM.
  const [hasRequestedItinerary, setHasRequestedItinerary] = useState(false);

  const generateItinerary = async () => {
    if (!destination || !preferences) return;
    setHasRequestedItinerary(true);
    setIsGenerating(true);
    setItineraryError(null);
    try {
      const tripData = {
        selected_destination: destination.name,
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
        input: { trip: tripData },
      });
      const result = res.data;
      setItinerary(result.days || []);
      trackEvent("itinerary_generated", { destination: destination.name, source: "trip_summary" });
    } catch (err) {
      setItineraryError("Could not generate itinerary. You can retry or continue to plan your trip.");
    }
    setIsGenerating(false);
  };

  // Progressive micro-status updates during itinerary generation
  const STATUS_MESSAGES = [
    "Checking visa rules for your passport...",
    "Scanning safety ratings...",
    "Building day-by-day itinerary...",
  ];
  useEffect(() => {
    if (!isGenerating) { setStatusIndex(0); return; }
    const interval = setInterval(() => {
      setStatusIndex(i => (i < STATUS_MESSAGES.length - 1 ? i + 1 : i));
    }, 2500);
    return () => clearInterval(interval);
  }, [isGenerating]);
  const statusMessage = STATUS_MESSAGES[statusIndex];

  // NOTE: Itinerary generation is now ON-DEMAND (button click), not auto-on-mount.
  // This lets the cost summary page render instantly without a 20-30s LLM wait.

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto px-4 py-8"
    >
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-5 rounded-full text-muted-foreground text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to destinations
      </Button>

      <h2 className="font-black text-2xl mb-1">Your Trip to {destination.city || destination.name?.split(",")[0]}</h2>
      <p className="text-muted-foreground text-sm mb-6 flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" /> {destination.full_location || destination.name}
      </p>

      {/* Trip Overview */}
      <Card className="p-5 rounded-2xl border-border mb-4">
        <h3 className="font-bold text-sm mb-3">Trip Overview</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Departure</p><p className="font-semibold">{preferences.departure_city}</p></div>
          <div><p className="text-xs text-muted-foreground">Destination</p><p className="font-semibold">{destination.city || destination.name?.split(",")[0]}</p></div>
          <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-semibold">{formatDate(preferences.start_date)}</p></div>
          <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-semibold">{formatDate(endDate)}</p></div>
          <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-semibold">{preferences.duration_days} nights</p></div>
          <div><p className="text-xs text-muted-foreground">Travellers</p><p className="font-semibold">{preferences.num_travelers} person{preferences.num_travelers > 1 ? "s" : ""}</p></div>
        </div>
      </Card>

      {/* Trip Itinerary Details — AI-generated day-by-day plan */}
      <Card className="p-5 rounded-2xl border-border mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" /> Trip Itinerary Details
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Your AI-generated day-by-day plan for {preferences.duration_days} days in {destination.city || destination.name?.split(",")[0]}.
        </p>

        {isGenerating && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="font-medium text-primary">{statusMessage}</span>
            </div>
            <ItinerarySkeleton days={Math.min(preferences?.duration_days || 3, 5)} />
          </div>
        )}

        {itineraryError && !isGenerating && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">{itineraryError}</p>
          </div>
        )}

        {!hasRequestedItinerary && !isGenerating && !itinerary && (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-3">
              Get a personalised day-by-day plan for {preferences.duration_days} days in {destination.city || destination.name?.split(",")[0]}.
            </p>
            <Button
              onClick={generateItinerary}
              variant="outline"
              className="w-full rounded-xl gap-2 h-11"
            >
              <Sparkles className="w-4 h-4 text-primary" /> Generate Day-by-Day Itinerary
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2">Takes ~20-30 seconds</p>
          </div>
        )}

        {itinerary && itinerary.length > 0 && (
          <div className="space-y-2.5">
            {itinerary.map((day, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <ItineraryDay
                  day={day}
                  dayNum={i + 1}
                  startDate={preferences.start_date}
                  isOpen={openDay === i + 1}
                  onToggle={() => setOpenDay(openDay === i + 1 ? 0 : i + 1)}
                />
              </motion.div>
            ))}
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              ⚠️ AI-generated — verify dates, availability &amp; entry requirements before booking.
            </p>
          </div>
        )}
      </Card>

      {/* Disclaimer */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">AI-generated recommendations &amp; estimates.</span> Always verify dates, prices, visa requirements, and safety advisories with official sources before booking. No payment is taken here — you pay directly on the booking site.
        </p>
      </div>

      <Button
        size="lg"
        onClick={onContinue}
        className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-13 text-base font-bold cursor-pointer transition-colors duration-200"
      >
        Plan My Full Trip <ChevronRight className="w-5 h-5" />
      </Button>
      <p className="text-center text-xs text-muted-foreground mt-3">Flights · Hotels · Tours · Cars — all in one place</p>
    </motion.div>
  );
}