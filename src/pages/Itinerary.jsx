import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, MapPin, Calendar, Clock,
  ChevronRight, ChevronDown, Sun, Sunset, Moon,
  Utensils, Camera, Hotel, Plane, Car, Info, Loader2
} from "lucide-react";
import { format } from "date-fns";
import BottomNav from "@/components/travel/BottomNav";
import { Link } from "react-router-dom";

const TIME_ICONS = { morning: Sun, afternoon: Camera, evening: Sunset, night: Moon };
const TIME_COLORS = {
  morning: "bg-amber-50 border-amber-200 text-amber-700",
  afternoon: "bg-sky-50 border-sky-200 text-sky-700",
  evening: "bg-orange-50 border-orange-200 text-orange-700",
  night: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

function DayCard({ day, dayNum, startDate }) {
  const [open, setOpen] = useState(dayNum === 1);
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNum - 1);

  return (
    <Card className="rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex flex-col items-center justify-center">
            <span className="text-xs font-bold leading-none">Day</span>
            <span className="text-base font-black leading-none">{dayNum}</span>
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">{day.theme || `Day ${dayNum}`}</p>
            <p className="text-xs text-muted-foreground">{format(date, "EEE, dd MMM")}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
              {["morning", "afternoon", "evening"].map(period => {
                const activities = day[period] || [];
                if (!activities.length) return null;
                const Icon = TIME_ICONS[period];
                return (
                  <div key={period} className={`rounded-xl border p-3 ${TIME_COLORS[period]}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold capitalize">{period}</span>
                    </div>
                    <div className="space-y-2">
                      {activities.map((act, i) => (
                        <div key={i} className="bg-white/60 rounded-lg p-2.5">
                          <p className="text-xs font-semibold text-foreground">{act.title}</p>
                          {act.description && <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>}
                          {act.cost && <p className="text-xs font-bold mt-1">💰 {act.cost}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {day.accommodation && (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-xl">
                  <Hotel className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Stay</p>
                    <p className="text-xs text-muted-foreground">{day.accommodation}</p>
                  </div>
                </div>
              )}
              {day.tips && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">{day.tips}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function Itinerary() {
  const [user, setUser] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 10),
  });

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  const generateItinerary = async () => {
    if (!selectedTrip) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "itinerary",
        input: { trip: selectedTrip },
      });
      const result = res.data;
      setItinerary(result.days || []);
    } catch (err) {
      setError("Could not generate itinerary. Please try again.");
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-none">Travel Itinerary</h1>
          <p className="text-xs text-muted-foreground">Day-by-day plan by Dbuddy AI</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <>
            {/* Trip selector */}
            {trips.length === 0 ? (
              <Card className="p-8 rounded-2xl text-center">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="font-bold mb-2">No trips yet</p>
                <p className="text-sm text-muted-foreground mb-4">Plan a trip first to generate your itinerary.</p>
                <Link to="/">
                  <Button className="rounded-xl bg-black text-white">Plan a Trip</Button>
                </Link>
              </Card>
            ) : (
              <>
                <div className="mb-5">
                  <p className="text-sm font-semibold mb-3">Select a trip</p>
                  <div className="space-y-2">
                    {trips.slice(0, 5).map(trip => (
                      <button
                        key={trip.id}
                        onClick={() => { setSelectedTripId(trip.id); setItinerary(null); }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${selectedTripId === trip.id ? "border-black bg-black text-white" : "border-border bg-white hover:border-black/30"}`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold">{trip.selected_destination || "Planned Trip"}</p>
                          <p className={`text-xs mt-0.5 ${selectedTripId === trip.id ? "text-white/60" : "text-muted-foreground"}`}>
                            {trip.start_date} · {trip.duration_days} days
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTripId && !itinerary && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 p-3 bg-muted rounded-xl text-sm text-muted-foreground mb-4">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Dbuddy AI will create your personalised day-by-day plan
                    </div>
                    {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                    <Button
                      onClick={generateItinerary}
                      disabled={isGenerating}
                      className="w-full rounded-xl bg-black text-white h-12 gap-2"
                    >
                      {isGenerating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Dbuddy AI is planning your trip...</>
                        : <><Sparkles className="w-4 h-4" /> Generate My Itinerary</>
                      }
                    </Button>
                  </div>
                )}

                {itinerary && selectedTrip && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="font-black text-lg">{selectedTrip.selected_destination}</h2>
                        <p className="text-xs text-muted-foreground">{selectedTrip.duration_days} days · {selectedTrip.start_date}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setItinerary(null)} className="rounded-xl text-xs">
                        Regenerate
                      </Button>
                    </div>
                    {itinerary.map((day, i) => (
                      <DayCard key={i} day={day} dayNum={i + 1} startDate={selectedTrip.start_date} />
                    ))}
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      ⚠️ AI-generated — verify dates, availability &amp; entry requirements before booking.
                    </p>
                  </motion.div>
                )}
              </>
            )}
        </>
      </div>

      <BottomNav active="itinerary" />
      <p className="fixed bottom-[112px] left-0 right-0 text-center text-[10px] text-muted-foreground py-1 z-40 pointer-events-none">
        📱 Need data in {selectedTrip?.selected_destination || "your destination"}? Get your eSIM before you fly — no SIM swap needed.{" "}
        <a href="https://cellesim.com/r/dheevoy-limited-rze" target="_blank" rel="nofollow sponsored" className="text-primary underline pointer-events-auto">Get eSIM →</a>
      </p>
      <p className="fixed bottom-[92px] left-0 right-0 text-center text-[10px] text-muted-foreground py-1 z-40 pointer-events-none">
        🛡️ Travel insurance recommended for this trip —{" "}
        <a href="https://safetywing.com/nomad-insurance?referenceID=26569327&utm_source=26569327&utm_medium=Ambassador" target="_blank" rel="noopener noreferrer" className="text-primary underline pointer-events-auto">Get covered →</a>
      </p>
      <p className="fixed bottom-[72px] left-0 right-0 text-center text-[10px] text-muted-foreground py-1 bg-slate-50/80 backdrop-blur-sm z-40 pointer-events-none">
        AI suggestions — always verify independently |{" "}
        <Link to="/terms" className="underline pointer-events-auto">T&amp;Cs</Link> apply
      </p>
    </div>
  );
}