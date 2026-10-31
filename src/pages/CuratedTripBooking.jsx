import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Compass } from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import BookingWidget from "@/components/curated/BookingWidget";
import { base44 } from "@/api/base44Client";

// Unified booking route — contains the 3-step BookingWidget (Travellers →
// Your Details → Payment & Confirmation). Light-themed, focused checkout:
// the Travel Checklist is intentionally NOT shown here; it appears only in
// the post-submission success state rendered by BookingWidget.
export default function CuratedTripBooking() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const tripId = params.get("trip"); // Trip record ID created by saveTrip on the detail page

  const { data: trip, isLoading } = useQuery({
    queryKey: ["curated_trips", id],
    queryFn: async () => base44.entities.curated_trips.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-curated-bg">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-curated-muted" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-curated-bg">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-sm text-curated-muted">This curated trip could not be found.</p>
          <Link to="/curated-trips" className="text-sm text-curated-accent underline mt-2 inline-block">
            ← Back to Curated Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-curated-bg pb-16">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 flex-wrap mb-4">
          <Link
            to={`/curated-trips/${trip.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-curated-muted hover:text-curated-heading"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Trip
          </Link>
          <Link
            to="/trips"
            className="inline-flex items-center gap-1.5 text-sm text-curated-muted hover:text-curated-heading"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Trips
          </Link>
        </div>

        <h1 className="font-display text-2xl font-bold text-curated-heading mb-1">{trip.trip_title}</h1>
        <p className="text-sm text-curated-muted mb-6">
          {trip.destination} • {trip.days} day{trip.days !== 1 ? "s" : ""}
        </p>

        <BookingWidget curatedTrip={trip} destination={trip.destination} tripId={tripId} />

        {/* Compact operator note — payment responsibility reassurance */}
        <div className="mt-5 rounded-xl bg-curated-card border border-curated-border p-4">
          <p className="text-xs font-semibold text-curated-heading flex items-center gap-1.5 mb-1">
            <Compass className="w-4 h-4 text-curated-accent" /> Tour Operator
          </p>
          <p className="text-sm font-medium text-curated-heading">{trip.dmc_partner_name}</p>
          <p className="text-xs text-curated-muted mt-1.5">
            Payment &amp; booking for this trip are handled directly by {trip.dmc_partner_name}.
          </p>
        </div>
      </div>
    </div>
  );
}