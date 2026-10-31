import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, RefreshCw, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import MultiCityBuilder from "@/components/multicity/MultiCityBuilder";
import JourneyOverview from "@/components/multicity/JourneyOverview";
import JourneyIntelligenceCard from "@/components/multicity/JourneyIntelligenceCard";
import SegmentItinerary from "@/components/multicity/SegmentItinerary";
import SavedJourneyNav from "@/components/multicity/SavedJourneyNav";
import SaveSuccessModal from "@/components/multicity/SaveSuccessModal";
import ReplanSegmentSelector from "@/components/multicity/ReplanSegmentSelector";
import SegmentBookingActions from "@/components/multicity/SegmentBookingActions";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { computeJourneyContext, normalizePaceLabel } from "@/lib/journeyContext";
import GuestAuthModal from "@/components/auth/GuestAuthModal";
import { savePendingJourney, loadPendingJourney, clearPendingJourney } from "@/lib/pendingJourney";
import posthog from "posthog-js";

// Multi-city / multi-country journey engine — one parent Trip + ordered
// TripSegment rows. Completely separate route from the single-destination
// /trip-dashboard flow, so the existing planner is untouched.
export default function MultiCityPlan() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();

  const [phase, setPhase] = useState("builder"); // builder | journey
  const [journey, setJourney] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [savedSegments, setSavedSegments] = useState([]);
  const [openSegment, setOpenSegment] = useState(0);
  const [genError, setGenError] = useState(null);
  const [showReplan, setShowReplan] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [savedTrip, setSavedTrip] = useState(null);
  const [editData, setEditData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Restore a saved multi-city trip via ?trip= param
  useEffect(() => {
    const id = params.get("trip");
    if (!id) return;
    (async () => {
      try {
        const trip = await base44.entities.Trip.get(id);
        if (trip.journey_type !== "multi_destination") return;
        const segs = await base44.entities.TripSegment.filter({ trip_id: id });
        const ordered = [...segs].sort((a, b) => a.sequence_number - b.sequence_number);
        setTripId(trip.id);
        setSavedSegments(ordered);
        const restoredPace = normalizePaceLabel(trip.journey_pace);
        setJourney({
          startCity: trip.departure_city,
          endCity: trip.departure_city,
          startDate: trip.start_date,
          endDate: null,
          segments: ordered.map((s) => ({
            destination: s.destination_full || s.destination_city,
            destination_full: s.destination_full || s.destination_city,
            destination_city: s.destination_city,
            destination_country: s.destination_country || "",
            destination_country_code: s.destination_country_code || "",
            destination_lat: s.destination_lat || null,
            destination_lng: s.destination_lng || null,
            mapbox_place_id: s.mapbox_place_id || null,
            arrival_date: s.arrival_date,
            departure_date: s.departure_date,
            nights: s.nights,
            transport_type: s.transport_type,
          })),
          metrics: { destinationCount: ordered.length, transferLegs: Math.max(0, ordered.length - 1), totalNights: 0, totalDays: trip.duration_days },
          pace: { label: restoredPace, level: 1, warning: null },
          intelligence: { label: restoredPace, level: 1, explanation: "", bestFor: "", watchOut: "", warning: null },
          travellers: { group_type: trip.group_type, num_travelers: trip.num_travelers, budget: trip.budget, travel_style: (trip.travel_style || "").split(", "), child_ages: trip.child_ages || [] },
        });
        const withDays = ordered.filter((s) => s.itinerary_data?.days?.length);
        if (withDays.length) {
          setItinerary({
            journey_overview: "",
            segments: ordered.map((s) => ({
              destination: s.destination_full,
              is_transfer_arrival: false,
              is_transfer_departure: false,
              days: s.itinerary_data?.days || [],
            })),
          });
        }
        setPhase(params.get("edit") === "1" ? "builder" : "journey");
      } catch {
        /* ignore — stay on builder */
      }
    })();
  }, []);

  // Restore a pending journey after authentication (e.g. Google OAuth redirect).
  // The journey was preserved in sessionStorage before the auth prompt. If the
  // user is now authenticated, auto-save immediately — no second click needed.
  useEffect(() => {
    if (params.get("trip")) return; // don't override explicit ?trip= loading
    const pending = loadPendingJourney();
    if (!pending) return;
    setJourney(pending.journey);
    setItinerary(pending.itinerary);
    if (pending.tripId) setTripId(pending.tripId);
    setPhase("journey");
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) {
        doSaveWithData(pending.journey, pending.itinerary, pending.tripId);
      }
    });
  }, []);

  useEffect(() => {
    posthog.capture("multi_city_trip_started", { page: window.location.pathname });
  }, []);

  // Journey intelligence viewed analytics — fires when pace becomes available.
  useEffect(() => {
    if (journey?.pace?.label) {
      posthog.capture("journey_pace_viewed", { pace: journey.pace.label, destinations: journey.metrics.destinationCount });
    }
  }, [journey?.pace?.label]);

  // Post-journey booking options viewed analytics — fires once after save.
  useEffect(() => {
    if (saved) {
      posthog.capture("journey_booking_options_viewed", { source: "post_save", trip_id: tripId });
    }
  }, [saved]);

  const handleGenerate = async (data) => {
    setJourney(data);
    setGenError(null);
    setIsGenerating(true);
    setPhase("journey");
    setSaved(false);
    posthog.capture("multi_city_destination_added", {
      destination_count: data.metrics.destinationCount,
      trip_duration_days: data.metrics.totalDays,
    });

    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "multi_city_itinerary",
        input: {
          start_city: data.startCity,
          end_city: data.endCity,
          start_date: data.startDate,
          end_date: data.endDate,
          total_days: data.metrics.totalDays,
          total_nights: data.metrics.totalNights,
          num_travelers: data.travellers.num_travelers,
          group_type: data.travellers.group_type,
          child_ages: data.travellers.child_ages,
          trip_pace: data.pace.label,
          budget: data.travellers.budget,
          travel_style: Array.isArray(data.travellers.travel_style) ? data.travellers.travel_style.join(", ") : data.travellers.travel_style,
          segments: data.segments.map((s) => ({
            destination: s.destination,
            arrival_date: s.arrival_date,
            departure_date: s.departure_date,
            nights: s.nights,
            transport_type: s.transport_type,
          })),
        },
      });
      const result = res.data;
      setItinerary(result);
      posthog.capture("multi_city_trip_generated", {
        destination_count: data.metrics.destinationCount,
        trip_duration_days: data.metrics.totalDays,
        trip_pace: data.pace.label,
      });
    } catch (err) {
      setGenError("Couldn't generate your connected itinerary. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleSelectSegment = (seg, i) => {
    setOpenSegment(i);
    posthog.capture("multi_city_segment_opened", { segment_index: i, destination: seg.destination_full || seg.destination_city });
    posthog.capture("journey_segment_viewed", { segment_index: i, destination: seg.destination_full || seg.destination_city });
    setTimeout(() => {
      const el = document.getElementById(`segment-detail-${i}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Core save logic — extracted so it can be called both directly (authed user)
  // and after auth restoration (pending journey from sessionStorage).
  const doSaveWithData = async (journeyData, itineraryData, tripIdData) => {
    if (!journeyData || !itineraryData) return;
    setIsSaving(true);
    try {
      const segsWithItin = journeyData.segments.map((s, i) => ({
        ...s,
        sequence_number: i + 1,
        segment_status: "planned",
        itinerary_data: itineraryData.segments[i] ? { days: itineraryData.segments[i].days, is_transfer_arrival: itineraryData.segments[i].is_transfer_arrival } : null,
      }));
      const tripData = {
        departure_city: journeyData.startCity,
        start_date: journeyData.startDate,
        duration_days: journeyData.metrics.totalDays,
        budget: journeyData.travellers.budget,
        travel_style: Array.isArray(journeyData.travellers.travel_style) ? journeyData.travellers.travel_style.join(", ") : journeyData.travellers.travel_style,
        group_type: journeyData.travellers.group_type,
        num_travelers: journeyData.travellers.num_travelers,
        child_ages: journeyData.travellers.child_ages,
        journey_pace: journeyData.pace.label,
        selected_destination: journeyData.segments.map((s) => s.destination_city).join(" → "),
        status: "planning",
        trip_type: "self_planned",
      };
      const res = await base44.functions.invoke("saveMultiCityTrip", tripIdData ? { trip_data: tripData, segments: segsWithItin, trip_id: tripIdData } : { trip_data: tripData, segments: segsWithItin });
      const savedRes = res.data;
      setTripId(savedRes.trip.id);
      const freshSegs = await base44.entities.TripSegment.filter({ trip_id: savedRes.trip.id });
      setSavedSegments([...freshSegs].sort((a, b) => a.sequence_number - b.sequence_number));
      posthog.capture("multi_city_trip_saved", {
        trip_id: savedRes.trip.id,
        destination_count: journeyData.metrics.destinationCount,
        trip_duration_days: journeyData.metrics.totalDays,
        trip_pace: journeyData.pace.label,
      });
      toast({ title: "Journey saved! 💾", description: `${journeyData.metrics.destinationCount} destinations saved as one trip.` });
      setSaved(true);
      setSavedTrip(savedRes.trip);
      setShowSuccessModal(true);
      clearPendingJourney();
    } catch (err) {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  // Auth interception: check authentication before attempting save.
  // If unauthenticated, preserve the journey and show an auth prompt —
  // never show "Save failed" for lack of auth.
  const handleSave = async () => {
    if (!journey || !itinerary) return;
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      savePendingJourney(journey, itinerary, tripId);
      setShowAuthModal(true);
      return;
    }
    await doSaveWithData(journey, itinerary, tripId);
  };

  const handleStartOver = () => {
    setParams({}, { replace: true });
    setPhase("builder");
    setJourney(null);
    setItinerary(null);
    setTripId(null);
    setSavedSegments([]);
    setGenError(null);
    setSaved(false);
    setShowSuccessModal(false);
    setShowBooking(false);
    setSavedTrip(null);
    setEditData(null);
  };

  // "Edit Journey" from the saved nav — return to the builder with the
  // existing journey context loaded so the user can refine stops/dates.
  const handleEditJourney = () => {
    setParams({}, { replace: true });
    setEditData(journey);
    setPhase("builder");
  };

  // Re-plan foundation: non-destructive. Only regenerates itinerary for the
  // selected segment and later uncompleted segments; never touches completed
  // or confirmed segments. The user chooses which segment to re-plan from via
  // the ReplanSegmentSelector — it does NOT auto-assume the first destination.
  const handleReplanFromHere = async (fromIdx) => {
    if (!journey || !itinerary || fromIdx == null) return;
    setShowReplan(false);
    setIsGenerating(true);
    try {
      const remainingSegs = journey.segments.slice(fromIdx);
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "multi_city_itinerary",
        input: {
          start_city: journey.segments[fromIdx - 1]?.destination_city || journey.startCity,
          end_city: journey.endCity,
          start_date: journey.segments[fromIdx].arrival_date,
          end_date: journey.endDate,
          total_days: journey.metrics.totalDays,
          total_nights: journey.metrics.totalNights,
          num_travelers: journey.travellers.num_travelers,
          group_type: journey.travellers.group_type,
          child_ages: journey.travellers.child_ages,
          trip_pace: journey.pace.label,
          budget: journey.travellers.budget,
          travel_style: Array.isArray(journey.travellers.travel_style) ? journey.travellers.travel_style.join(", ") : journey.travellers.travel_style,
          segments: remainingSegs.map((s) => ({ destination: s.destination, arrival_date: s.arrival_date, departure_date: s.departure_date, nights: s.nights, transport_type: s.transport_type })),
        },
      });
      const result = res.data;
      setItinerary((prev) => {
        const next = { ...prev, segments: [...(prev?.segments || [])] };
        result.segments.forEach((seg, i) => {
          next.segments[fromIdx + i] = seg;
        });
        return next;
      });
      toast({ title: "Re-planned from this stop", description: "Later stops were regenerated. Earlier and completed stops are unchanged." });
    } catch (err) {
      toast({ title: "Re-plan failed", description: "Please try again.", variant: "destructive" });
    }
    setIsGenerating(false);
  };

  const ctx = computeJourneyContext(savedSegments.length ? savedSegments : journey?.segments || []);

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:pb-16 lg:bg-[linear-gradient(180deg,#f2f6ff_0%,#faf8ff_42%,#f7fbff_100%)]">
      <Navbar />

      <AnimatePresence mode="wait">
        {phase === "builder" && (
          <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="multicity-content max-w-6xl lg:max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
            <button onClick={() => navigate("/plan")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4 min-h-[44px]">
              <ArrowLeft className="w-4 h-4" /> Back to Plan
            </button>
            <MultiCityBuilder onGenerate={handleGenerate} isGenerating={isGenerating} initialData={editData} />
          </motion.div>
        )}

        {phase === "journey" && journey && (
          <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="multicity-content max-w-6xl lg:max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
            {/* Persistent navigation for saved journeys — Back to My Trips, Home, Edit */}
            <SavedJourneyNav onEdit={handleEditJourney} tripId={tripId} />

            {/* Desktop: 70/30 grid (main itinerary + sticky sidebar). Mobile/tablet: stacked. */}
            <div className="grid lg:grid-cols-[minmax(0,1.85fr)_minmax(330px,0.9fr)] gap-5 lg:gap-7">
              {/* Main itinerary column (~70%) */}
              <div className="lg:col-span-1 space-y-4 order-2 lg:order-1 lg:space-y-6">
                {/* Journey overview blurb */}
                {itinerary?.journey_overview && (
                  <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
                    <p className="text-xs uppercase tracking-wider text-teal-300 font-semibold mb-1.5 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Connected Journey
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">{itinerary.journey_overview}</p>
                  </div>
                )}

                {/* Generating state */}
                {isGenerating && !itinerary && (
                  <div className="flex flex-col items-center gap-3 py-12 rounded-2xl border border-white/10 bg-white/5">
                    <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
                    <p className="text-sm text-slate-300">Building your connected itinerary across {journey.metrics.destinationCount} destinations…</p>
                  </div>
                )}

                {genError && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300 inline-flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {genError}
                  </div>
                )}

                {/* Per-segment itinerary — redesigned visual day cards */}
                {itinerary?.segments && (
                  <div className="space-y-4">
                    <h3 className="font-display text-base font-bold text-white pt-2">Stop-by-stop itinerary</h3>
                    {itinerary.segments.map((seg, i) => (
                      <div key={i} id={`segment-detail-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">{seg.destination}</p>
                            <p className="text-[11px] text-slate-400">
                              {journey.segments[i].arrival_date} → {journey.segments[i].departure_date} · {journey.segments[i].nights} night{journey.segments[i].nights !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <SegmentItinerary
                          segment={seg}
                          segmentIndex={i}
                          arrivalDate={journey.segments[i].arrival_date}
                          destinationFull={seg.destination}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar column (~30%) — sticky on desktop */}
              <div className="lg:col-span-1 space-y-4 order-1 lg:order-2 lg:sticky lg:top-24 self-start">
                <JourneyOverview
                  segments={savedSegments.length ? savedSegments : journey.segments}
                  onSelectSegment={handleSelectSegment}
                  startCity={journey.startCity}
                  endCity={journey.endCity}
                />

                <JourneyIntelligenceCard
                  intelligence={journey.intelligence || journey.pace}
                  metrics={journey.metrics}
                  travellers={journey.travellers}
                />

                {/* Save */}
                {itinerary?.segments && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {tripId ? "Update Journey" : "Save This Journey"}
                  </button>
                )}

                {/* Segment-aware booking actions — replaces generic chatbot handoff.
                    Uses Trip + TripSegment context so the user never re-enters
                    destination, dates, or traveller counts. Available on both
                    freshly saved and restored saved journeys. */}
                {(saved || tripId) && showBooking && (
                  <SegmentBookingActions
                    journey={journey}
                    trip={savedTrip || { id: tripId, num_travelers: journey?.travellers?.num_travelers, group_type: journey?.travellers?.group_type, budget: journey?.travellers?.budget, travel_style: journey?.travellers?.travel_style, child_ages: journey?.travellers?.child_ages, departure_city: journey?.startCity }}
                    segments={savedSegments.length ? savedSegments : journey.segments}
                  />
                )}
                {(saved || tripId) && !showBooking && (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="w-full rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-300 text-sm font-medium py-3 min-h-[48px] inline-flex items-center justify-center gap-2 hover:bg-teal-500/15"
                  >
                    <Sparkles className="w-4 h-4" /> Book by destination
                  </button>
                )}

                {/* Re-plan — segment selector. User chooses which stop to
                    re-plan from; completed segments are locked. */}
                {itinerary?.segments && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <button
                      onClick={() => setShowReplan((v) => !v)}
                      className="text-xs text-slate-400 hover:text-teal-300 inline-flex items-center gap-1.5 min-h-[40px] w-full"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-plan from a stop
                    </button>
                    {showReplan && (
                      <div className="mt-3">
                        <ReplanSegmentSelector
                          segments={savedSegments.length ? savedSegments : journey.segments}
                          onReplan={handleReplanFromHere}
                          isGenerating={isGenerating}
                          onCancel={() => setShowReplan(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer disclaimer — separated from the grid with margin so the
                sticky sidebar never overlaps it. Extra bottom padding clears
                the fixed BottomNav on mobile. */}
            <p className="text-[11px] text-muted-foreground text-center pt-8 pb-4 mb-6 leading-relaxed">
              AI-generated guidance. Always verify visa requirements with the official embassy and check government foreign-travel-advice before travelling.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success modal — only shown after a successful save. Dismissible. */}
      <SaveSuccessModal
        open={showSuccessModal}
        onStartBooking={() => {
          setShowSuccessModal(false);
          setShowBooking(true);
        }}
        onViewJourney={() => {
          setShowSuccessModal(false);
          if (tripId) setParams({ trip: tripId }, { replace: true });
        }}
        onDismiss={() => setShowSuccessModal(false)}
      />

      {/* Guest auth modal — shown when an unauthenticated user clicks Save.
          Journey is preserved in sessionStorage; on success it auto-saves. */}
      <AnimatePresence>
        {showAuthModal && (
          <GuestAuthModal
            triggerReason="save_journey"
            heading="Save your journey"
            subtitle="Create a free account or sign in to save this trip and continue to booking."
            onClose={() => setShowAuthModal(false)}
            onSuccess={async () => {
              setShowAuthModal(false);
              const pending = loadPendingJourney();
              if (pending) {
                await doSaveWithData(pending.journey, pending.itinerary, pending.tripId);
              } else {
                await doSaveWithData(journey, itinerary, tripId);
              }
            }}
          />
        )}
      </AnimatePresence>

      <BottomNav active="/plan" />
    </div>
  );
}
