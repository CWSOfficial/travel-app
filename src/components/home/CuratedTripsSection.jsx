import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CuratedTripCard from "@/components/curated/CuratedTripCard";

// Homepage section: surfaces published DMC-partner curated trips.
// Queries published:true only, sorted by created_date descending.
// Renders nothing (no section) when zero records exist — the homepage
// stays clean until real published trips are available.
export default function CuratedTripsSection() {
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["curated_trips", "published", "home"],
    queryFn: () => base44.entities.curated_trips.filter({ published: true }, "-created_date", 6),
  });

  if (!isLoading && trips.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12 w-full lg:rounded-[2rem] lg:border lg:border-white/90 lg:bg-white/65 lg:p-7 xl:p-8 lg:shadow-[0_12px_36px_rgba(16,33,73,0.07)] lg:backdrop-blur-sm" aria-label="Curated trips">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2 lg:text-2xl">
            <Compass className="w-5 h-5 text-primary" /> Curated Trips
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Hand-picked packages from vetted local partners
          </p>
        </div>
        <Link
          to="/curated-trips"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-blue-800 transition-colors"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl bg-white border border-border h-72 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trips.map((trip, i) => (
            <CuratedTripCard key={trip.id} trip={trip} index={i} compact />
          ))}
        </div>
      )}
    </section>
  );
}
