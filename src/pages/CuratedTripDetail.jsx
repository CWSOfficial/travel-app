import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import GuestAuthModal from "@/components/auth/GuestAuthModal";
import TripHero from "@/components/curated/detail/TripHero";
import DestinationGallery from "@/components/curated/detail/DestinationGallery";
import TripHighlights from "@/components/curated/detail/TripHighlights";
import InclusionCard from "@/components/curated/detail/InclusionCard";
import ItineraryTimeline from "@/components/curated/detail/ItineraryTimeline";
import ExclusionCard from "@/components/curated/detail/ExclusionCard";
import OperatorTrustCard from "@/components/curated/detail/OperatorTrustCard";
import CancellationCard from "@/components/curated/detail/CancellationCard";
import MobileStickyBookingBar from "@/components/curated/detail/MobileStickyBookingBar";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import posthog from "posthog-js";

// Reusable, light-themed curated-trip package template. Dynamically loads any
// curated_trips record — no hard-coded package content. Reuses the existing
// saveTrip backend function and preserves all analytics events.
export default function CuratedTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["curated_trips", id],
    queryFn: async () => base44.entities.curated_trips.get(id),
    enabled: !!id,
  });

  // PostHog: fire once when the trip detail loads successfully
  useEffect(() => {
    if (!trip) return;
    const urlParams = new URLSearchParams(window.location.search);
    posthog.capture("curated_trip_viewed", {
      trip_id: trip.id,
      trip_name: trip.trip_title,
      destination: trip.destination,
      price: trip.price_per_person,
      currency: trip.currency,
      utm_source: urlParams.get("utm_source"),
      utm_medium: urlParams.get("utm_medium"),
      utm_campaign: urlParams.get("utm_campaign"),
    });
  }, [trip]);

  // Primary package CTA — fires trip_selected at the actual click that enters
  // the booking journey, then creates a Trip record via the existing saveTrip
  // function and routes to the unified booking flow.
  const handleSelect = async () => {
    posthog.capture("trip_selected", {
      trip_id: trip.id,
      trip_name: trip.trip_title,
      destination: trip.destination,
      price: trip.price_per_person,
      currency: trip.currency,
    });
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      setShowAuth(true);
      return;
    }
    await doSelect();
  };

  const doSelect = async () => {
    setSelecting(true);
    try {
      const res = await base44.functions.invoke("saveTrip", {
        trip_data: {
          departure_city: "—",
          start_date: new Date().toISOString().split("T")[0],
          duration_days: trip.days || 1,
          selected_destination: trip.destination,
          destination_details: { name: trip.destination, curated: true },
          trip_type: "curated",
          curated_trip_id: trip.id,
          dmc_partner_name: trip.dmc_partner_name,
          status: "planning",
          checklist_completion: {},
        },
      });
      trackEvent("curated_trip_selected", {
        curated_trip_id: trip.id,
        dmc: trip.dmc_partner_name,
      });
      const newTripId = res.data?.trip?.id || res.trip?.id;
      navigate(`/curated-trips/${trip.id}/book?trip=${newTripId}`);
    } catch (err) {
      console.error("Curated trip select failed:", err);
      setSelecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-curated-bg">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-curated-muted" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-curated-bg">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-sm text-curated-muted">This curated trip could not be found.</p>
          <Link
            to="/curated-trips"
            className="text-sm text-curated-accent underline mt-2 inline-block"
          >
            ← Back to Curated Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-curated-bg pb-28 md:pb-12">
      <Navbar />

      <TripHero trip={trip} onSelect={handleSelect} selecting={selecting} />

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 flex items-center gap-4 flex-wrap">
        <Link
          to="/curated-trips"
          className="inline-flex items-center gap-1.5 text-sm text-curated-muted hover:text-curated-heading"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all trips
        </Link>
        <Link
          to="/trips"
          className="inline-flex items-center gap-1.5 text-sm text-curated-muted hover:text-curated-heading"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Trips
        </Link>
      </div>

      <DestinationGallery photos={trip.photos} />
      <TripHighlights trip={trip} />
      <InclusionCard trip={trip} />
      <ItineraryTimeline trip={trip} />
      <ExclusionCard trip={trip} />
      <OperatorTrustCard trip={trip} />
      <CancellationCard trip={trip} />

      <MobileStickyBookingBar trip={trip} onSelect={handleSelect} selecting={selecting} />

      <AnimatePresence>
        {showAuth && (
          <GuestAuthModal
            triggerReason="curated_trip"
            onClose={() => setShowAuth(false)}
            onSuccess={async () => {
              setShowAuth(false);
              await doSelect();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}