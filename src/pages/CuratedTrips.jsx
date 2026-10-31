import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import posthog from 'posthog-js';
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Compass, ImageOff } from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import CuratedTripCard from "@/components/curated/CuratedTripCard";

// Browse screen for DMC-partner curated trips.
// Queries published:true records only, sorted by created_date descending.
// Shows an honest empty state when zero records exist — NEVER fabricates
// trip content, photos, prices or DMC names.
export default function CuratedTrips() {
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["curated_trips", "published"],
    queryFn: () => base44.entities.curated_trips.filter({ published: true }, "-created_date", 50),
  });

  useEffect(() => {
    posthog.capture('pillar_engaged', {
      pillar: 'Curated DMC Trips',
      action: 'viewed',
      page: window.location.pathname,
    });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 text-foreground">
            <Compass className="w-6 h-6 text-primary" /> Curated Trips
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hand-picked packages from vetted local partners.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-white border border-border h-72 shadow-[0_3px_12px_rgba(16,33,73,0.055)] animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          /* Honest empty state — zero fabricated content */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-4 rounded-3xl border border-border/80 bg-white shadow-[0_4px_18px_rgba(16,33,73,0.05)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-5">
              <ImageOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-bold text-lg mb-2 text-foreground">Curated trips are coming soon</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We're building partnerships with local tour operators to bring you hand-picked travel packages. Check back shortly — real trips will appear here the moment they're published.
            </p>
            <Link
              to="/plan"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
            >
              Plan It Yourself instead →
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trips.map((trip, i) => (
              <CuratedTripCard key={trip.id} trip={trip} index={i} />
            ))}
          </div>
        )}
      </div>
      <BottomNav active="/plan" />
    </div>
  );
}
