import { motion } from "framer-motion";

// Shimmer skeleton placeholder for itinerary day cards while AI generates.
// Mirrors the ItineraryDay layout so the transition to real cards is seamless.
export default function ItinerarySkeleton({ days = 3 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: days }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          {/* Header row */}
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
              <div className="h-2 w-20 bg-muted/70 animate-pulse rounded" />
            </div>
            <div className="w-4 h-4 bg-muted animate-pulse rounded shrink-0" />
          </div>
          {/* Body rows */}
          <div className="px-3 pb-3 space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="rounded-lg border border-border p-2.5 space-y-2">
                <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
                <div className="h-8 bg-muted/50 animate-pulse rounded-md" />
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}