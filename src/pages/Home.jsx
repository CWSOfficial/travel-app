import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrencyFromCity } from "@/lib/currency";
import { saveGuestSession, loadGuestSession, clearGuestSession } from "@/lib/guestSession";
import { saveDraftState, loadDraftState, clearDraftState } from "@/lib/tripDraft";
import GuestAuthModal from "@/components/auth/GuestAuthModal";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/components/ui/use-toast";

import Navbar from "@/components/travel/Navbar";
import HeroSection from "@/components/travel/HeroSection";
import PreferencesForm from "@/components/travel/PreferencesForm";
import DestinationCard from "@/components/travel/DestinationCard";
import TripCostSummary from "@/components/travel/TripCostSummary";
import FlightHotelPicker from "@/components/travel/FlightHotelPicker";
import BottomNav from "@/components/travel/BottomNav";
import DisclaimerModal from "@/components/travel/DisclaimerModal";
import WishlistTooltip from "@/components/wishlist/WishlistTooltip";
import HomePrepare from "@/components/home/HomePrepare";
import NearbyPreview from "@/components/home/NearbyPreview";
import NearbyLive from "@/components/home/NearbyLive";
import SmartGuides from "@/components/home/SmartGuides";
import CuratedTripsSection from "@/components/home/CuratedTripsSection";
import { Link } from "react-router-dom";

const VIEWS = { LANDING: "landing", HERO: "hero", FORM: "form", RESULTS: "results", COST_SUMMARY: "cost_summary", PICKER: "picker", CONFIRM: "confirm" };

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [view, setView] = useState(VIEWS.LANDING);

  const [preferences, setPreferences] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [flightOptions, setFlightOptions] = useState([]);
  const [hotelOptions, setHotelOptions] = useState([]);
  const [nearbyFlightDates, setNearbyFlightDates] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [bookedTripId, setBookedTripId] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authModalReason, setAuthModalReason] = useState(null);
  const [pendingContinue, setPendingContinue] = useState(false);
  const [initialDestination, setInitialDestination] = useState(null);
  const restoredRef = useRef(false);
  const skipUrlClean = useRef(true);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── On mount: restore from URL params (?trip=ID, ?step=X, ?dest=Name) or localStorage draft ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const tripId = searchParams.get("trip");
    const destParam = searchParams.get("dest");
    const stepParam = searchParams.get("step");

    if (tripId) {
      // Load a saved trip from the database and jump to picker
      loadSavedTrip(tripId);
      return;
    }

    if (destParam) {
      // Wishlist "Plan This Trip" — pre-fill destination and show form
      setInitialDestination(destParam);
      setView(VIEWS.FORM);
      return;
    }

    // Only restore draft on page refresh / direct URL entry — indicated by ?step= param.
    // A clean "/" URL (no params) means the user explicitly clicked Home: show hero,
    // clear any stale draft so Home always means Home.
    if (stepParam) {
      const draft = loadDraftState();
      if (draft && (draft.preferences || draft.selectedDest)) {
        setPreferences(draft.preferences || null);
        setRecommendations(draft.recommendations || []);
        setSelectedDest(draft.selectedDest || null);
        setFlightOptions(draft.flightOptions || []);
        setHotelOptions(draft.hotelOptions || []);
        setNearbyFlightDates(draft.nearbyFlightDates || []);
        setCurrentTripId(draft.currentTripId || null);
        setView(draft.view === VIEWS.CONFIRM ? VIEWS.LANDING : (draft.view || VIEWS.HERO));
      } else {
        // No draft — honour the explicit step param (e.g. Plan page → ?step=form)
        setView(stepParam === "form" ? VIEWS.FORM : stepParam === "hero" ? VIEWS.HERO : VIEWS.LANDING);
      }
      return;
    }

    // Explicit Home navigation (clean URL) — clear stale draft
    clearDraftState();

    // Also check auth + guest session (auth redirect flow)
    base44.auth.me().then(u => {
      setUser(u);
      const guest = loadGuestSession();
      if (u && guest) {
        if (guest.pendingFormSubmit && guest.formData) {
          clearGuestSession();
          setAutoSubmitting(true);
          generateRecommendations(guest.formData);
        } else {
          setPreferences(guest.preferences);
          setRecommendations(guest.recommendations || []);
          setSelectedDest(guest.selectedDest || null);
          setView(guest.view || VIEWS.RESULTS);
          clearGuestSession();
          if (guest.pendingContinue) {
            setPendingContinue(true);
          }
        }
      }
    }).catch(() => {});
  }, []);

  // ── Auto-save draft to localStorage whenever key state changes ──
  useEffect(() => {
    if ((view === VIEWS.LANDING || view === VIEWS.HERO) && !preferences && !selectedDest) return;
    saveDraftState({
      preferences, recommendations, selectedDest,
      flightOptions, hotelOptions, nearbyFlightDates,
      currentTripId, view,
    });
  }, [preferences, recommendations, selectedDest, flightOptions, hotelOptions, nearbyFlightDates, currentTripId, view]);

  // ── Sync URL ?step= param whenever the view changes ──
  useEffect(() => {
    // Skip the very first run so the mount effect can restore/set the view
    // before this effect cleans the step param with a stale LANDING view.
    if (skipUrlClean.current) {
      skipUrlClean.current = false;
      return;
    }
    if ((view === VIEWS.LANDING || view === VIEWS.HERO) && !searchParams.get("trip") && !searchParams.get("dest")) {
      // On landing/hero view with no special params, clean the URL
      if (searchParams.get("step")) {
        const params = new URLSearchParams(searchParams);
        params.delete("step");
        setSearchParams(params, { replace: true });
      }
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set("step", view);
    setSearchParams(params, { replace: true });
  }, [view]);

  // ── React to Home button click: clean URL while inside a flow view → reset to landing ──
  useEffect(() => {
    const step = searchParams.get("step");
    const trip = searchParams.get("trip");
    const dest = searchParams.get("dest");
    if (!step && !trip && !dest && view !== VIEWS.LANDING && view !== VIEWS.HERO) {
      clearDraftState();
      setView(VIEWS.LANDING);
      setPreferences(null);
      setRecommendations([]);
      setSelectedDest(null);
      setFlightOptions([]);
      setHotelOptions([]);
      setNearbyFlightDates([]);
      setCurrentTripId(null);
      setError(null);
      setInitialDestination(null);
    }
  }, [searchParams]);

  // ── Load a saved trip from DB and jump straight to the flight/hotel picker ──
  const loadSavedTrip = async (tripId) => {
    try {
      const trip = await base44.entities.Trip.get(tripId);
      const prefs = {
        departure_city: trip.departure_city,
        start_date: trip.start_date,
        duration_days: trip.duration_days,
        budget: trip.budget,
        travel_style: trip.travel_style,
        group_type: trip.group_type,
        num_travelers: trip.num_travelers || 1,
        email: trip.email,
        phone: trip.phone,
        notification_method: trip.notification_method || "email",
        mode: "known",
      };
      const dest = trip.destination_details || { name: trip.selected_destination };
      setPreferences(prefs);
      setSelectedDest(dest);
      setRecommendations(trip.recommendations || []);
      setCurrentTripId(trip.id);
      setView(VIEWS.PICKER);
      setIsLoadingPicker(true);

      // Re-run search with the saved trip's parameters
      const currency = getCurrencyFromCity(prefs.departure_city);
      const result = await base44.functions.invoke("searchFlightsHotels", {
        departure_city: prefs.departure_city,
        destination_city: dest.city || (dest.name || "").split(",")[0].trim(),
        start_date: prefs.start_date,
        duration_days: prefs.duration_days,
        num_travelers: prefs.num_travelers,
        currency_code: currency.code,
      });
      setFlightOptions(result.data?.flights || []);
      setHotelOptions(result.data?.hotels || []);
      setNearbyFlightDates(result.data?.nearby_flight_dates || []);
    } catch (err) {
      console.error("Failed to load saved trip:", err);
      setView(VIEWS.HERO);
    } finally {
      setIsLoadingPicker(false);
    }
  };



  // Auto-proceed to cost summary picker after guest session restore
  useEffect(() => {
    if (pendingContinue && user && selectedDest && preferences) {
      setPendingContinue(false);
      handleCostSummaryContinue();
    }
  }, [pendingContinue, user, selectedDest, preferences]);

  // STEP 1: Generate AI recommendations (guests allowed — email captured in form)
  const generateRecommendations = async (prefs) => {
    setPreferences(prefs);
    setError(null);

    setIsGenerating(true);
    setView(VIEWS.FORM);

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

    // Compute derived fields client-side (reduces LLM output tokens)
    const dests = (result.destinations || []).map(d => ({
      ...d,
      temp_fahrenheit: d.temp_celsius != null ? Math.round(d.temp_celsius * 9 / 5 + 32) : null,
      budget_tier: prefs.budget, // set from user's selection — not generated by LLM
    }));
    setRecommendations(dests);
    setIsGenerating(false);
    setAutoSubmitting(false);
    setView(VIEWS.RESULTS);
    } catch (err) {
      setIsGenerating(false);
      const msg = err?.message || "";
      if (msg.includes("limit") || msg.includes("upgrade")) {
        setError("You've reached your monthly AI usage limit. Please upgrade your plan at base44.com to continue generating recommendations.");
      } else {
        setError("Something went wrong generating recommendations. Please try again.");
      }
      setAutoSubmitting(false);
      setView(VIEWS.FORM);
    }
  };

  // Gate helper — saves guest session then shows auth modal
  const requireAuth = (reason, onAuthed) => {
    if (user) {
      onAuthed();
      return;
    }
    // Persist current state so it survives the auth redirect
    saveGuestSession({
      preferences,
      recommendations,
      selectedDest,
      view: VIEWS.COST_SUMMARY,
      pendingContinue: reason === "flights",
    });
    setAuthModalReason(reason);
  };

  const handleAuthSuccess = async () => {
    setAuthModalReason(null);
    // Re-fetch user, then the useEffect will restore session and auto-continue
    const u = await base44.auth.me().catch(() => null);
    if (u) {
      setUser(u);
      const guest = loadGuestSession();
      if (guest) {
        setPreferences(guest.preferences);
        setRecommendations(guest.recommendations || []);
        setSelectedDest(guest.selectedDest || null);
        setView(guest.view || VIEWS.RESULTS);
        clearGuestSession();
        if (guest.pendingContinue) {
          setPendingContinue(true);
        }
      }
    }
  };

  // STEP 2: Select destination → go to cost summary
  const handleSelectDestination = (dest) => {
    setSelectedDest(dest);
    setView(VIEWS.COST_SUMMARY);
  };

  // STEP 3: User happy with cost → gate auth for guests, then generate flight + hotel options
  const handleCostSummaryContinueGated = () => {
    requireAuth("flights", () => handleCostSummaryContinue());
  };

  const handleCostSummaryContinue = async () => {
    setView(VIEWS.PICKER);
    setIsLoadingPicker(true);

    const currency = getCurrencyFromCity(preferences.departure_city);
    const endDate = new Date(preferences.start_date);
    endDate.setDate(endDate.getDate() + parseInt(preferences.duration_days));
    const endDateStr = endDate.toISOString().split("T")[0];

    try {
      const result = await base44.functions.invoke('searchFlightsHotels', {
        departure_city: preferences.departure_city,
        destination_city: selectedDest.city || (selectedDest.name || '').split(',')[0].trim(),
        start_date: preferences.start_date,
        duration_days: preferences.duration_days,
        num_travelers: preferences.num_travelers,
        currency_code: currency.code,
      });
      console.log('[searchFlightsHotels] raw result keys:', Object.keys(result || {}));
      console.log('[searchFlightsHotels] result.data keys:', result?.data ? Object.keys(result.data) : 'no data');
      console.log('[searchFlightsHotels] flights count:', result?.data?.flights?.length || 0);
      if ((result?.data?.flights || []).length === 0) {
        console.log('[searchFlightsHotels] WARNING TEXT:', result?.data?.warning || '(no warning field)');
      }
      setFlightOptions(result.data?.flights || []);
      setHotelOptions(result.data?.hotels || []);
      setNearbyFlightDates(result.data?.nearby_flight_dates || []);
    } catch (err) {
      console.error('[searchFlightsHotels] invoke threw:', err?.message || err, '| status:', err?.response?.status, '| response data:', err?.response?.data);
      setFlightOptions([]);
      setHotelOptions([]);
      setNearbyFlightDates([]);
    }
    setIsLoadingPicker(false);
  };

  // Re-run flight/hotel search with a different start date (from nearby-dates picker)
  const handleRetryWithDate = async (newDate) => {
    setIsLoadingPicker(true);
    const currency = getCurrencyFromCity(preferences.departure_city);
    const updatedPrefs = { ...preferences, start_date: newDate };
    setPreferences(updatedPrefs);

    try {
      const result = await base44.functions.invoke('searchFlightsHotels', {
        departure_city: updatedPrefs.departure_city,
        destination_city: selectedDest.city || (selectedDest.name || '').split(',')[0].trim(),
        start_date: newDate,
        duration_days: updatedPrefs.duration_days,
        num_travelers: updatedPrefs.num_travelers,
        currency_code: currency.code,
      });
      if ((result?.data?.flights || []).length === 0) {
        console.log('[searchFlightsHotels retry] WARNING TEXT:', result?.data?.warning || '(no warning field)');
      }
      setFlightOptions(result.data?.flights || []);
      setHotelOptions(result.data?.hotels || []);
      setNearbyFlightDates(result.data?.nearby_flight_dates || []);
    } catch (err) {
      setFlightOptions([]);
      setHotelOptions([]);
      setNearbyFlightDates([]);
    }
    setIsLoadingPicker(false);
  };

  // Fallback: if total_cost is still the transient "Calculating…" placeholder at save time
  // (wishlist-sourced trip that never reached the flight/hotel picker), persist an honest
  // fallback so the saved trip never shows a stuck "Calculating…" value in My Trips.
  const sanitizeDestForSave = (dest) => ({
    ...dest,
    total_cost: dest?.total_cost === "Calculating…" ? "Not yet estimated" : dest?.total_cost,
  });

  // Build the standard trip data payload (shared by save-draft and continue-to-checklist)
  const buildTripData = (status = "planning") => ({
    departure_city: preferences.departure_city,
    start_date: preferences.start_date,
    duration_days: preferences.duration_days,
    budget: preferences.budget,
    travel_style: preferences.travel_style,
    group_type: preferences.group_type,
    num_travelers: preferences.num_travelers,
    email: preferences.email,
    phone: preferences.phone,
    notification_method: preferences.notification_method,
    selected_destination: selectedDest.name,
    destination_details: sanitizeDestForSave(selectedDest),
    recommendations,
    status,
  });

  // STEP 4a: Save trip as draft (status "planning") — always available, no booking needed
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await base44.functions.invoke('saveTrip', { trip_data: buildTripData("planning") });
      setCurrentTripId(result.data.trip.id);
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      trackEvent("trip_saved", { status: "planning", destination: selectedDest?.name });
      setIsSaving(false);
      toast({
        title: "Trip saved! 💾",
        description: `Your trip to ${selectedDest?.name} has been saved to your profile.`,
      });
      navigate(`/confirmation?trip=${result.data.trip.id}`);
    } catch (err) {
      setIsSaving(false);
      setError("Something went wrong saving your trip. Please try again.");
    }
  };

  // Continue to Travel Checklist — just navigate. No save attempt, no error toast.
  // If the trip is already saved (currentTripId), pass it. Otherwise pass in-memory
  // trip details via router state so the checklist still works.
  const handleContinueToChecklist = () => {
    if (currentTripId) {
      navigate(`/travel-checklist?trip=${currentTripId}&path=self_planned`);
    } else {
      navigate('/travel-checklist', {
        state: {
          tripDetails: {
            selected_destination: selectedDest?.name,
            departure_city: preferences?.departure_city,
            start_date: preferences?.start_date,
            duration_days: preferences?.duration_days,
          },
        },
      });
    }
  };

  // STEP 4b: Confirm trip (status "confirmed") — user has booked externally
  const handleConfirmReady = async ({ flight, hotel } = {}) => {
    setIsSaving(true);
    const tripData = {
      departure_city: preferences.departure_city,
      start_date: preferences.start_date,
      duration_days: preferences.duration_days,
      budget: preferences.budget,
      travel_style: preferences.travel_style,
      group_type: preferences.group_type,
      num_travelers: preferences.num_travelers,
      email: preferences.email,
      phone: preferences.phone,
      notification_method: preferences.notification_method,
      selected_destination: selectedDest.name,
      destination_details: sanitizeDestForSave(selectedDest),
      recommendations,
      flight_booking_ref: flight ? `${flight.airline} ${flight.flight_number}` : undefined,
      hotel_booking_ref: hotel ? hotel.name : undefined,
      status: "confirmed",
    };

    let trip;
    try {
      const result = await base44.functions.invoke('saveTrip', currentTripId
        ? { trip_data: tripData, trip_id: currentTripId }
        : { trip_data: tripData }
      );
      trip = result.data.trip;
      if (!currentTripId) setCurrentTripId(trip.id);
      trackEvent("trip_saved", { status: "confirmed", destination: selectedDest?.name });
    } catch (err) {
      setIsSaving(false);
      setError("Something went wrong saving your trip. Please try again.");
      setView(VIEWS.PICKER);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["trips"] });

    // Email + in-app notification handled by saveTrip function

    setIsSaving(false);
    // Show the "Booked!" popup in the picker instead of navigating to confirmation
    setBookedTripId(trip.id);
  };

  // STEP 4: Save booking references
  const handleSaveRefs = async ({ flight_booking_ref, hotel_booking_ref }) => {
    setIsSaving(true);
    if (currentTripId) {
      await base44.entities.Trip.update(currentTripId, {
        flight_booking_ref,
        hotel_booking_ref,
        status: "booked",
      });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    }
    setIsSaving(false);
  };

  // Called from Wishlist "Plan This Trip" — skips form, goes straight to cost summary
  const handlePlanFromWishlist = (wishlistItem) => {
    const dest = {
      name: wishlistItem.destination_name,
      city: wishlistItem.destination_city || wishlistItem.destination_name,
      destination_country: wishlistItem.destination_country,
      destination_image_url: wishlistItem.destination_image_url || "",
      destination_lat: wishlistItem.destination_lat,
      destination_lng: wishlistItem.destination_lng,
      flight_cost: "–",
      hotel_cost: "–",
      activities_cost: "–",
      total_cost: "Calculating…",
      visa_requirement: "Check official sources",
      safety_rating: "Check travel advisories",
      weather: "Check local forecasts",
    };
    setSelectedDest(dest);
    if (preferences) {
      setView(VIEWS.COST_SUMMARY);
    } else {
      setInitialDestination(wishlistItem.destination_name);
      setView(VIEWS.FORM);
    }
  };

  const handleStartOver = () => {
    clearDraftState();
    setSearchParams({}, { replace: true });
    setView(VIEWS.HERO);
    setPreferences(null);
    setRecommendations([]);
    setSelectedDest(null);
    setFlightOptions([]);
    setHotelOptions([]);
    setNearbyFlightDates([]);
    setCurrentTripId(null);
    setError(null);
    setInitialDestination(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DisclaimerModal />
      <Navbar />

      <AnimatePresence mode="wait">
        {view === VIEWS.LANDING && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-background min-h-[calc(100vh-3.5rem)]">
            <HomePrepare />
            <CuratedTripsSection />
            <NearbyPreview />
            <NearbyLive />
            <SmartGuides />
          </motion.div>
        )}

        {view === VIEWS.HERO && (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HeroSection onStartPlanning={() => {
              // trip_started Key Event moved to BentoCanvas.handleBuild (reachable /plan → /trip-dashboard flow).
              setView(VIEWS.FORM);
            }} />
          </motion.div>
        )}

        {view === VIEWS.FORM && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-14">
            {autoSubmitting ? (
              <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">✨ Revealing Top 3 Destinations</h3>
                <p className="text-sm text-muted-foreground">Our AI is crafting your personalised recommendations…</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="max-w-xl mx-auto mb-6 px-4">
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
                      ⚠️ {error}
                    </div>
                  </div>
                )}
                <PreferencesForm onSubmit={generateRecommendations} isLoading={isGenerating} initialDestination={initialDestination} />
              </>
            )}
          </motion.div>
        )}

        {view === VIEWS.RESULTS && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto px-4 py-14">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold">Top 3 Destinations For You</h2>
              <p className="text-muted-foreground mt-2 text-base">
                From <span className="font-medium text-foreground">{preferences?.departure_city}</span> · {preferences?.duration_days} days · {preferences?.budget?.replace("_", " ")}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((dest, i) => (
                <DestinationCard key={i} destination={dest} index={i} onSelect={handleSelectDestination} />
              ))}
            </div>
            <div className="text-center mt-4">
              <button
                onClick={() => setView(VIEWS.FORM)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                ← Adjust preferences & search again
              </button>
            </div>
          </motion.div>
        )}

        {view === VIEWS.COST_SUMMARY && selectedDest && (
          <motion.div key="cost_summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10">
            <TripCostSummary
              destination={selectedDest}
              preferences={preferences}
              onBack={() => setView(VIEWS.RESULTS)}
              onContinue={handleCostSummaryContinueGated}
            />
          </motion.div>
        )}

        {view === VIEWS.PICKER && selectedDest && (
          <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10">
            <FlightHotelPicker
              destination={selectedDest}
              preferences={preferences}
              flightOptions={flightOptions}
              hotelOptions={hotelOptions}
              nearbyFlightDates={nearbyFlightDates}
              isLoading={isLoadingPicker}
              onBack={() => setView(VIEWS.COST_SUMMARY)}
              onConfirm={handleConfirmReady}
              onSaveDraft={handleSaveDraft}
              onRetryWithDate={handleRetryWithDate}
              isSaving={isSaving}
              currentTripId={currentTripId}
              bookedTripId={bookedTripId}
              onContinueToChecklist={handleContinueToChecklist}
            />
          </motion.div>
        )}

        {/* Confirmation is now a dedicated route at /confirmation?trip=ID */}
      </AnimatePresence>

      <BottomNav active="/" onPlanFromWishlist={handlePlanFromWishlist} />
      <WishlistTooltip />

      <AnimatePresence>
        {authModalReason && (
          <GuestAuthModal
            triggerReason={authModalReason}
            onClose={() => setAuthModalReason(null)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
