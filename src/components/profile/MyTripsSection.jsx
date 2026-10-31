import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Compass, ClipboardList, ChevronRight, Plane, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Profile → My Trips section. Shows BOTH trip types under one unified Trip entity,
// tagged/badged clearly as "Self-planned" or "Curated" — the same record serves the
// user-facing view and future internal analytics.
export default function MyTripsSection() {
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["profile-my-trips"],
    queryFn: async () => {
      try {
        const u = await base44.auth.me();
        if (!u) return [];
        return base44.entities.Trip.list("-created_date", 50);
      } catch { return []; }
    },
  });

  const selfPlanned = trips.filter((t) => t.trip_type !== "curated");
  const curated = trips.filter((t) => t.trip_type === "curated");

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4">
        <p className="text-xs text-muted-foreground">Loading your trips…</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 text-center">
        <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium mb-1">No trips yet</p>
        <p className="text-xs text-muted-foreground mb-4">Start planning your first adventure.</p>
        <Link to="/plan" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-semibold">
          Plan a Trip →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Self-planned trips */}
      {selfPlanned.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-4 h-4 text-sky-500" />
            <h3 className="font-semibold text-sm">Self-Planned</h3>
            <span className="text-xs text-muted-foreground">({selfPlanned.length})</span>
          </div>
          <div className="space-y-2">
            {selfPlanned.map((t) => (
              <TripRow key={t.id} trip={t} type="self_planned" />
            ))}
          </div>
        </div>
      )}

      {/* Curated trips */}
      {curated.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Curated</h3>
            <span className="text-xs text-muted-foreground">({curated.length})</span>
          </div>
          <div className="space-y-2">
            {curated.map((t) => (
              <TripRow key={t.id} trip={t} type="curated" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TripRow({ trip, type }) {
  const isCurated = type === "curated";
  const checklist = trip.checklist_completion || {};
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = 8;

  return (
    <Link
      to={isCurated ? (trip.curated_trip_id ? `/curated-trips/${trip.curated_trip_id}` : `/travel-checklist?trip=${trip.id}&path=curated`) : `/?trip=${trip.id}`}
      className="block rounded-2xl border border-border bg-white p-3.5 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isCurated ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-sky-50 text-sky-700 border border-sky-100"}`}>
              {isCurated ? "Curated" : "Self-Planned"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">{trip.status}</span>
          </div>
          <p className="font-semibold text-sm truncate">{trip.selected_destination || "Trip"}</p>
          {isCurated ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {trip.dmc_partner_name ? `DMC: ${trip.dmc_partner_name}` : "DMC partner"} · {trip.duration_days} days
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              From {trip.departure_city} · {trip.duration_days} days
            </p>
          )}
          {trip.start_date && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {trip.start_date}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isCurated && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ClipboardList className="w-3 h-3" /> {checklistDone}/{checklistTotal}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}