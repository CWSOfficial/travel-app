import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Home } from "lucide-react";
import SavedJourneyCard from "@/components/multicity/SavedJourneyCard";
import BottomNav from "@/components/travel/BottomNav";
import { useAuth } from "@/lib/AuthContext";
import posthog from "posthog-js";

// ── Canonical "My Trips" library ──
// One unified page for ALL saved/booked journeys:
//   • Single Trip       (Trip.journey_type = single_destination, trip_type = self_planned)
//   • Multi-City Journey (Trip.journey_type = multi_destination)
//   • Curated/DMC Trip   (Trip.trip_type = curated)
// Saved Reports remain separate at /saved-reports.
// The old /itinerary "Select a trip" page is retired and redirects here.
export default function Trips() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all"); // all | upcoming | past

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Trip.list("-created_date", 50);
    },
    enabled: !!user?.id,
  });

  // Analytics: fire once when the library is viewed
  useEffect(() => {
    posthog.capture("my_trips_viewed", {
      trip_count: trips.length,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Simple client-side All / Upcoming / Past filter
  const today = new Date().toISOString().split("T")[0];
  const filteredTrips = useMemo(() => {
    if (filter === "all") return trips;
    return trips.filter((t) => {
      if (!t.start_date) return filter === "upcoming"; // undated = upcoming
      return filter === "upcoming" ? t.start_date >= today : t.start_date < today;
    });
  }, [trips, filter, today]);

  const upcomingCount = trips.filter((t) => !t.start_date || t.start_date >= today).length;
  const pastCount = trips.filter((t) => t.start_date && t.start_date < today).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-base leading-none">My Trips</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your saved and booked journeys</p>
          </div>
          <Link to="/">
            <Button size="sm" className="rounded-full gap-1.5 bg-black text-white text-xs">
              <Plus className="w-3.5 h-3.5" /> Plan New
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Navigation: Back to Profile · Home */}
        <div className="flex items-center gap-4 mb-5 text-xs">
          <Link to="/profile" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground min-h-[36px]">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground min-h-[36px]">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </div>

        {/* Filter chips — only show if there are trips */}
        {trips.length > 0 && (
          <div className="flex gap-2 mb-5">
            {[
              { key: "all", label: "All", count: trips.length },
              { key: "upcoming", label: "Upcoming", count: upcomingCount },
              { key: "past", label: "Past", count: pastCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[32px] ${
                  filter === f.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        )}

        {/* Trip grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <p className="text-5xl mb-4">✈️</p>
            <p className="font-bold text-lg mb-2">{filter === "all" ? "No trips yet" : `No ${filter} trips`}</p>
            <p className="text-muted-foreground text-sm mb-6">
              {filter === "all"
                ? "Start planning your first adventure with Dbuddy AI!"
                : filter === "upcoming"
                  ? "Plan a new trip to see it here."
                  : "Your past trips will appear here."}
            </p>
            <Link to="/">
              <Button className="rounded-full bg-black text-white px-8">Plan a Trip</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((trip) => (
              <SavedJourneyCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="/trips" />
    </div>
  );
}