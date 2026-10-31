import { Link } from "react-router-dom";
import { Calendar, Clock, Users, ChevronRight, Edit3 } from "lucide-react";
import { getDestinationHero } from "@/lib/destinationImages";
import { normalizePaceLabel } from "@/lib/journeyContext";
import posthog from "posthog-js";

const PACE_STYLES = {
  RELAXED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  BALANCED: "bg-teal-500/15 text-teal-300 border-teal-500/25",
  "FAST-PACED": "bg-amber-500/15 text-amber-300 border-amber-500/25",
  HECTIC: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

// Polished saved-journey card for the "Your Saved Journeys" library.
// Shows route, dates, duration, traveller type, pace (multi-city), and
// destination count. Supports single-destination, multi-city, and curated trips.
export default function SavedJourneyCard({ trip }) {
  const isMultiCity = trip.journey_type === "multi_destination";
  const isCurated = trip.trip_type === "curated";

  const routeParts = (trip.selected_destination || "").split(" → ").filter(Boolean);
  const destCount = isMultiCity ? routeParts.length : 1;

  // Truncate long routes: "Athens → Venice → Madrid +2 more"
  const displayRoute =
    routeParts.length > 4
      ? `${routeParts.slice(0, 3).join(" → ")} +${routeParts.length - 3} more`
      : routeParts.join(" → ") || "Trip";

  const firstDest = routeParts[0] || trip.selected_destination || "";
  const thumb = getDestinationHero(firstDest);

  const openPath = isMultiCity
    ? `/multi-city?trip=${trip.id}`
    : isCurated
      ? (trip.curated_trip_id ? `/curated-trips/${trip.curated_trip_id}` : `/travel-checklist?trip=${trip.id}&path=curated`)
      : `/?trip=${trip.id}`;

  const editPath = isMultiCity ? `/multi-city?trip=${trip.id}&edit=1` : `/?trip=${trip.id}`;

  const tripType = isMultiCity ? "multi_city" : isCurated ? "curated_trip" : "single_trip";

  const handleOpen = () => {
    posthog.capture("saved_trip_opened", {
      trip_type: tripType,
      destination_count: isMultiCity ? routeParts.length : 1,
      trip_id: trip.id,
    });
  };

  const handleEdit = () => {
    posthog.capture("saved_trip_edit_started", {
      trip_type: tripType,
      trip_id: trip.id,
    });
  };

  const pace = trip.journey_pace ? normalizePaceLabel(trip.journey_pace) : null;
  const paceStyle = PACE_STYLES[pace] || "bg-slate-500/15 text-slate-300 border-slate-500/25";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-teal-500/30 transition-all group">
      {/* Thumbnail with route overlay */}
      <Link to={openPath} onClick={handleOpen} className="block relative h-28 sm:h-32">
        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              isMultiCity
                ? "bg-teal-500/30 text-teal-200 border-teal-500/40"
                : isCurated
                  ? "bg-amber-500/30 text-amber-200 border-amber-500/40"
                  : "bg-sky-500/30 text-sky-200 border-sky-500/40"
            }`}
          >
            {isMultiCity ? "Multi-City" : isCurated ? "Curated" : "Single Trip"}
          </span>
        </div>

        {/* Route */}
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-sm font-bold text-white truncate">{displayRoute}</p>
          {isMultiCity && destCount > 1 && (
            <p className="text-[10px] text-white/70">{destCount} destinations</p>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="p-3 space-y-2.5">
        {/* Dates + duration + travellers */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
          {trip.start_date && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {trip.start_date}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {trip.duration_days}d
          </span>
          <span className="inline-flex items-center gap-1 capitalize">
            <Users className="w-3 h-3" /> {trip.group_type || "solo"}
          </span>
        </div>

        {/* Pace + status badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isMultiCity && pace && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${paceStyle}`}>
              {pace}
            </span>
          )}
          <span className="text-[9px] text-slate-500 capitalize">{trip.status || "planning"}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            to={openPath}
            onClick={handleOpen}
            className="flex-1 rounded-xl bg-teal-500/15 border border-teal-500/25 text-teal-300 text-xs font-semibold py-2 inline-flex items-center justify-center gap-1.5 hover:bg-teal-500/20 transition-colors min-h-[36px]"
          >
            Open Journey <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          {!isCurated && (
            <Link
              to={editPath}
              onClick={handleEdit}
              className="rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs font-medium py-2 px-3 inline-flex items-center justify-center gap-1 hover:bg-white/10 transition-colors min-h-[36px]"
              aria-label="Edit journey"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}