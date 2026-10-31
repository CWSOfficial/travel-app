import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ImageOff, MapPin, Clock, Tag, ArrowRight } from "lucide-react";

// Dark glassmorphic widget card for a published curated trip.
// Renders ONLY fields from the curated_trips entity — never fabricates content.
// Clicking navigates to /curated-trips/[trip_id] (the detail route).
export default function CuratedTripCard({ trip, index = 0, compact = false }) {
  const cover = trip.photos?.[0];
  const locationPill = [trip.destination, trip.days ? `${trip.days}d` : null]
    .filter(Boolean)
    .join(" • ");
  const tags = (trip.tags || []).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/curated-trips/${trip.id}`}
        className="block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-sky-300 transition-all group"
      >
        {/* Cover photo with vetted-partner overlay badge */}
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={trip.trip_title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-8 h-8 text-slate-400" />
            </div>
          )}
          {/* Vetted Local Partner badge */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white">
            🟢 Vetted Local Partner
          </span>
        </div>

        {/* Body */}
        <div className="p-4 bg-white">
          {/* Title */}
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-slate-900">
            {trip.trip_title}
          </h3>

          {/* Location & duration pill */}
          {locationPill && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
              <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
              {locationPill}
            </p>
          )}

          {compact ? (
            /* Homepage: lean card — Explore link to encourage clicks into details */
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 group-hover:gap-1.5 transition-all">
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          ) : (
            <>
              {/* Category tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5"
                    >
                      <Tag className="w-2.5 h-2.5 text-sky-600" /> {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Price tag */}
              {trip.price_display && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" /> {trip.dfy_or_dwy === "dfy" ? "Done For You" : "Done With You"}
                  </span>
                  <span className="text-sm font-bold text-sky-700">{trip.price_display}</span>
                </div>
              )}
            </>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
