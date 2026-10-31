import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, Plane, Hotel, ShieldCheck, ClipboardList, Save, ArrowRight,
  Sparkles, Loader2, MapPin, Calendar, Clock, ChevronDown, Sun, Sunset, Moon,
  Camera, Info, Compass, Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import CuratedPaymentStep from "@/components/curated/CuratedPaymentStep";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import { buildItineraryPrompt, ITINERARY_RESPONSE_SCHEMA } from "@/lib/itineraryGenerator";

const DOC_CHECKLIST = [
  { icon: "🛂", item: "Valid passport (must be 6+ months validity)" },
  { icon: "📋", item: "Visa requirements checked for your destination" },
  { icon: "🏥", item: "Travel insurance arranged" },
  { icon: "💊", item: "Required vaccinations / health requirements" },
  { icon: "💳", item: "Notify your bank of travel dates" },
  { icon: "📱", item: "Download airline & hotel apps" },
  { icon: "📞", item: "Save local emergency contacts & embassy number" },
  { icon: "🔒", item: "Backup copies of all travel documents" },
];

const TIME_ICONS = { morning: Sun, afternoon: Camera, evening: Sunset, night: Moon };
const TIME_COLORS = {
  morning: "bg-amber-50 border-amber-200 text-amber-700",
  afternoon: "bg-sky-50 border-sky-200 text-sky-700",
  evening: "bg-orange-50 border-orange-200 text-orange-700",
  night: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

function ItineraryDayCard({ day, dayNum, startDate }) {
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

function DmcItineraryCard({ day, dayNum }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
        {day.day || dayNum}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{day.title || `Day ${day.day || dayNum}`}</p>
        {day.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{day.description}</p>}
        {day.included && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Included in package
          </span>
        )}
      </div>
    </div>
  );
}

export default function Confirmation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tripId = params.get("trip");

  const [trip, setTrip] = useState(null);
  const [curatedTrip, setCuratedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [itineraryError, setItineraryError] = useState(null);
  const [flightRef, setFlightRef] = useState("");
  const [hotelRef, setHotelRef] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    base44.entities.Trip.get(tripId)
      .then(async (t) => {
        setTrip(t);
        if (t.trip_type === "curated" && t.curated_trip_id) {
          try {
            const ct = await base44.entities.curated_trips.get(t.curated_trip_id);
            setCuratedTrip(ct);
          } catch { /* curated record may be unpublished — ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId]);

  const isCurated = trip?.trip_type === "curated";

  const generateItinerary = async () => {
    if (!trip) return;
    setIsGenerating(true);
    setItineraryError(null);
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "itinerary",
        input: { trip },
      });
      const result = res.data;
      setItinerary(result.days || []);
      trackEvent("itinerary_generated", { destination: trip.selected_destination, source: "confirmation" });
    } catch (err) {
      setItineraryError("Could not generate itinerary. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleSaveRefs = async () => {
    setIsSaving(true);
    if (tripId) {
      try {
        await base44.entities.Trip.update(tripId, {
          flight_booking_ref: flightRef || undefined,
          hotel_booking_ref: hotelRef || undefined,
          status: "booked",
        });
        trackEvent("booking_refs_saved", { destination: trip?.selected_destination });
      } catch (err) {
        console.error("Failed to save refs:", err);
      }
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
        <BottomNav active="/" />
      </div>
    );
  }

  if (!tripId || !trip) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-bold text-lg mb-2">No trip found</h2>
          <p className="text-sm text-muted-foreground mb-5">Plan a trip first to see your confirmation.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold">
            Plan a Trip →
          </Link>
        </div>
        <BottomNav active="/" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 py-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="font-black text-3xl">{isCurated ? "Confirm Your Trip" : "You're All Set! ✈️"}</h2>
          <p className="text-slate-600 mt-2 text-sm max-w-sm mx-auto leading-relaxed">
            {isCurated ? (
              <>Your curated trip to <span className="font-semibold text-foreground">{trip.selected_destination}</span> is saved. Complete payment below to secure your spot.</>
            ) : (
              <>Your trip to <span className="font-semibold text-foreground">{trip.selected_destination}</span> is saved.</>
            )}
          </p>
        </div>

        {/* Curated trips: Payment & Confirmation step (Pay via PayPal / Bank + Upload Receipt) */}
        {isCurated && (
          <CuratedPaymentStep curatedTrip={curatedTrip} destination={trip.selected_destination} />
        )}

        {/* PROMINENT CTA — Prepare before you book */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 border-2 border-primary/30 p-5 mb-6 shadow-sm"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Prepare before you book</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Complete your Travel Checklist — visa, safety, weather, eSIM & insurance — before booking flights and hotels.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="lg"
              onClick={() => navigate(`/travel-checklist?trip=${tripId}&path=${isCurated ? "curated" : "self_planned"}`)}
              className="rounded-full gap-2 bg-black hover:bg-black/80 text-white px-6 flex-1 h-12 text-base font-bold"
            >
              <ClipboardList className="w-5 h-5" />
              Continue to Travel Checklist
              <ArrowRight className="w-5 h-5" />
            </Button>
            <button
              onClick={() => trackEvent("checklist_skipped_from_confirmation", { destination: trip.selected_destination })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2.5 px-3 sm:self-center min-h-[44px] inline-flex items-center"
            >
              Skip for now
            </button>
          </div>
        </motion.div>

        {/* Itinerary */}
        <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4" /> Your Itinerary
          </h3>

          {isCurated ? (
            /* Curated: DMC-provided itinerary — no AI generation needed */
            curatedTrip?.itinerary_days?.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-2.5 mb-2 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Provided by <span className="font-semibold">{curatedTrip.dmc_partner_name}</span> — no AI generation needed.
                  </p>
                </div>
                {curatedTrip.itinerary_days.map((d, i) => (
                  <DmcItineraryCard key={i} day={d} dayNum={i + 1} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your DMC partner ({curatedTrip?.dmc_partner_name || "the operator"}) will provide the day-by-day itinerary.
                Contact them at {curatedTrip?.dmc_contact_info || "their listed contact"} for details.
              </p>
            )
          ) : (
            /* Self-planned: AI-generated itinerary (reuses the same logic as Itinerary page) */
            <>
              {!itinerary && !isGenerating && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 p-3 bg-muted rounded-xl text-sm text-muted-foreground mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Dbuddy AI will create your personalised day-by-day plan
                  </div>
                  {itineraryError && <p className="text-red-600 text-sm mb-4">{itineraryError}</p>}
                  <Button
                    onClick={generateItinerary}
                    className="w-full rounded-xl bg-black text-white h-12 gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Generate My Itinerary
                  </Button>
                </div>
              )}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Dbuddy AI is planning your trip…</p>
                </div>
              )}
              {itinerary && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {itinerary.map((day, i) => (
                    <ItineraryDayCard key={i} day={day} dayNum={i + 1} startDate={trip.start_date} />
                  ))}
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    ⚠️ AI-generated — verify dates, availability &amp; entry requirements before booking.
                  </p>
                </motion.div>
              )}
            </>
          )}
        </Card>

        {/* Booking summary — self-planned only (what the user has selected so far) */}
        {!isCurated && (trip.flight_booking_ref || trip.hotel_booking_ref) && (
          <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4" /> What You've Booked So Far
            </h3>
            <div className="space-y-2">
              {trip.flight_booking_ref && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted">
                  <Plane className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs"><span className="font-semibold">Flight:</span> {trip.flight_booking_ref}</p>
                </div>
              )}
              {trip.hotel_booking_ref && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted">
                  <Hotel className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs"><span className="font-semibold">Hotel:</span> {trip.hotel_booking_ref}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Booking refs — self-planned only */}
        {!isCurated && (
          <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
              <Plane className="w-4 h-4" /> Booking Reference Numbers
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Enter your reference numbers after booking on Expedia, Hotels.com or Aviasales.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5"><Plane className="w-3 h-3" /> Flight Ref</Label>
                <Input placeholder="e.g. SKY-AB12345" value={flightRef} onChange={e => setFlightRef(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5"><Hotel className="w-3 h-3" /> Hotel Ref</Label>
                <Input placeholder="e.g. BKG-XY98765" value={hotelRef} onChange={e => setHotelRef(e.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>
          </Card>
        )}

        {/* Travel Documents Checklist */}
        <Card className="p-5 border-border shadow-sm mb-8 rounded-2xl">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4" /> Travel Documents Checklist
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {DOC_CHECKLIST.map(({ icon, item }, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <span className="flex-shrink-0">{icon}</span>
                <p className="text-xs text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!isCurated && (
            <Button size="lg" onClick={handleSaveRefs} disabled={isSaving} className="rounded-full gap-2 bg-black hover:bg-black/80 text-white px-8">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Reference Numbers"}
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={() => navigate("/trips")} className="rounded-full gap-2 px-8">
            <Briefcase className="w-4 h-4" /> View in My Trips
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/")} className="rounded-full gap-2 px-8">
            Plan Another Trip ✈️
          </Button>
        </div>
      </motion.div>
      <BottomNav active="/" />
    </div>
  );
}