import { useState } from "react";
import { motion } from "framer-motion";
import { Plane, Train, Bus, Car, Ship, ChevronRight, MapPin } from "lucide-react";
import { formatDateShort, daysBetween, computeJourneyContext } from "@/lib/journeyContext";
import { getDestinationHero } from "@/lib/destinationImages";

const TRANSPORT_ICON = {
  flight: Plane,
  train: Train,
  bus: Bus,
  car: Car,
  ferry: Ship,
};

const STATUS_STYLE = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  active: "border-teal-500/50 bg-teal-500/15 text-teal-300 ring-2 ring-teal-500/30",
  upcoming: "border-white/15 bg-white/5 text-slate-200",
  planned: "border-white/15 bg-white/5 text-slate-200",
};

// Visual vertical timeline of ordered destination segments. Each stop shows a
// destination thumbnail, city/country label, dates, nights, and the transport
// icon for the next leg. Clickable to open that segment's itinerary. Compact
// and responsive across mobile / tablet / desktop.
export default function JourneyOverview({ segments, onSelectSegment, startCity, endCity }) {
  const [imgErrors, setImgErrors] = useState({});
  if (!segments || segments.length === 0) return null;

  const ctx = computeJourneyContext(segments);
  const ordered = [...segments].sort((a, b) => a.sequence_number - b.sequence_number);

  const statusFor = (seg, i) => {
    if (ctx.currentIndex === i) return "active";
    if (ctx.currentIndex > i) return "completed";
    return "upcoming";
  };

  const onImgError = (key) => setImgErrors((prev) => ({ ...prev, [key]: true }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-bold text-white inline-flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-teal-400" /> Journey Overview
        </h3>
        <span className="text-[10px] text-slate-400">
          {ctx.completedCount}/{ctx.totalSegments} done
        </span>
      </div>

      {/* Home origin */}
      <div className="flex items-center gap-2 mb-2 pl-1">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
        <span className="text-xs text-slate-400">{startCity ? `From ${startCity}` : "Start"}</span>
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/10" />

        <div className="space-y-1.5">
          {ordered.map((seg, i) => {
            const status = statusFor(seg, i);
            const nights =
              seg.nights != null
                ? seg.nights
                : seg.arrival_date && seg.departure_date
                  ? daysBetween(seg.arrival_date, seg.departure_date)
                  : null;
            const NextTransport = i < ordered.length - 1 ? TRANSPORT_ICON[ordered[i].transport_type] || Plane : null;
            const isClickable = !!onSelectSegment;
            const hero = getDestinationHero(seg.destination_full || seg.destination_city);
            const imgKey = `ov-${i}`;
            const imgFailed = imgErrors[imgKey];
            const destFull = seg.destination_full || seg.destination_city;

            return (
              <div key={seg.id || i} className="relative">
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative ml-0 rounded-xl border ${STATUS_STYLE[status]} ${isClickable ? "cursor-pointer hover:border-teal-500/50 transition-colors" : ""}`}
                  onClick={isClickable ? () => onSelectSegment(seg, i) : undefined}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={`${destFull} — ${status}`}
                >
                  <div className="flex items-stretch gap-3 p-2.5">
                    {/* Destination thumbnail */}
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-teal-500/30 to-slate-700/40">
                      {!imgFailed && hero && (
                        <img
                          src={hero}
                          alt=""
                          loading="lazy"
                          onError={() => onImgError(imgKey)}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black/70 text-[10px] font-bold flex items-center justify-center text-teal-300">
                        {seg.sequence_number || i + 1}
                      </span>
                    </div>

                    {/* City / dates / nights */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{destFull}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {seg.arrival_date ? formatDateShort(seg.arrival_date) : ""}
                          {seg.departure_date ? ` – ${formatDateShort(seg.departure_date)}` : ""}
                          {nights != null ? ` · ${nights} night${nights !== 1 ? "s" : ""}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {status === "completed" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Done</span>}
                        {status === "active" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">Now</span>}
                        {isClickable && <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {NextTransport && (
                  <div className="flex items-center gap-2 py-1.5 pl-1 text-[11px] text-slate-400">
                    <span className="w-9 flex justify-center">
                      <NextTransport className="w-3.5 h-3.5 text-teal-400" />
                    </span>
                    <span className="capitalize">{ordered[i].transport_type || "flight"}</span>
                    <span className="text-slate-600">→</span>
                    <span className="truncate">{ordered[i + 1].destination_city}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pl-1">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
        <span className="text-xs text-slate-400">{endCity ? `Return to ${endCity}` : "Return home"}</span>
      </div>
    </div>
  );
}