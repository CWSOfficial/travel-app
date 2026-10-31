import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sun, Camera, Moon, Hotel, Info, Plane, Clock, Tag } from "lucide-react";
import { formatDateShort, addDays } from "@/lib/journeyContext";
import { assignDayImages, getActivityImage } from "@/lib/destinationImages";

const TIME_ICONS = { morning: Sun, afternoon: Camera, evening: Moon };
const TIME_META = {
  morning: { label: "Morning", chip: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  afternoon: { label: "Afternoon", chip: "bg-sky-500/15 text-sky-300 border-sky-500/25" },
  evening: { label: "Evening", chip: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25" },
};

// Compact visual day card for ONE segment's itinerary. Editorial feel:
// destination image header, day number + date, concise title, Morning /
// Afternoon / Evening as compact activity cards with chip tags. Replaces the
// old text-heavy accordion. Responsive: stacked on mobile, wider on desktop.
export default function SegmentItinerary({ segment, segmentIndex, arrivalDate, destinationFull }) {
  const days = segment?.days || [];
  const [openDay, setOpenDay] = useState(0);
  const [imgErrors, setImgErrors] = useState({});

  if (!days.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-xs text-slate-400">No itinerary generated for this stop yet.</p>
      </div>
    );
  }

  const dest = destinationFull || segment.destination;
  const dayImages = assignDayImages(days.length, dest);

  const onImgError = (key) => setImgErrors((prev) => ({ ...prev, [key]: true }));

  return (
    <div className="space-y-2.5">
      {segment.is_transfer_arrival && (
        <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 inline-flex items-center gap-2">
          <Plane className="w-3.5 h-3.5 text-teal-300" />
          <span className="text-[11px] text-teal-200">Arrival day — lighter schedule</span>
        </div>
      )}

      {days.map((day, i) => {
        const open = openDay === i;
        const dayDate = arrivalDate ? formatDateShort(addDays(arrivalDate, i)) : "";
        const heroImg = dayImages[i];
        const imgKey = `day-${segmentIndex}-${i}`;
        const imgFailed = imgErrors[imgKey];
        const isTransfer = (i === 0 && segment.is_transfer_arrival) || (i === days.length - 1 && segment.is_transfer_departure);

        return (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            {/* Day header with image */}
            <button
              onClick={() => setOpenDay(open ? -1 : i)}
              className="w-full flex items-stretch text-left hover:bg-white/[0.03] transition-colors"
              aria-expanded={open}
            >
              {/* Image thumbnail (lazy; gradient fallback on error) */}
              <div className="relative w-20 sm:w-24 shrink-0 bg-gradient-to-br from-teal-500/30 to-slate-700/40">
                {!imgFailed && heroImg && (
                  <img
                    src={heroImg}
                    alt=""
                    loading="lazy"
                    onError={() => onImgError(imgKey)}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-teal-300">
                  D{i + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0 p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{day.theme || `Day ${i + 1}`}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {dayDate && (
                      <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {dayDate}
                      </span>
                    )}
                    {isTransfer && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/20">Transfer</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/10">
                    {["morning", "afternoon", "evening"].map((period) => {
                      const activities = day[period] || [];
                      if (!activities.length) return null;
                      const meta = TIME_META[period];
                      const PIcon = TIME_ICONS[period];
                      return (
                        <div key={period} className="space-y-1.5">
                          <div className="inline-flex items-center gap-1.5">
                            <PIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.chip}`}>{meta.label}</span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-1.5">
                            {activities.map((act, j) => {
                              const actImgKey = `act-${segmentIndex}-${i}-${period}-${j}`;
                              const actImg = getActivityImage(act.title, dest, j + i);
                              const actFailed = imgErrors[actImgKey];
                              return (
                                <div key={j} className="rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden flex">
                                  <div className="relative w-14 shrink-0 bg-gradient-to-br from-slate-600/40 to-slate-800/40">
                                    {!actFailed && actImg && (
                                      <img
                                        src={actImg}
                                        alt=""
                                        loading="lazy"
                                        onError={() => onImgError(actImgKey)}
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 p-2">
                                    <p className="text-xs font-semibold text-white leading-tight">{act.title}</p>
                                    {act.description && <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">{act.description}</p>}
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      {act.cost && <span className="text-[10px] font-semibold text-teal-300">💰 {act.cost}</span>}
                                      {Array.isArray(act.tags) && act.tags.slice(0, 3).map((tag, k) => (
                                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 inline-flex items-center gap-0.5">
                                          <Tag className="w-2.5 h-2.5" /> {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Stay + tips as small cards */}
                    <div className="grid sm:grid-cols-2 gap-1.5 pt-1">
                      {day.accommodation && (
                        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                          <Hotel className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-300">Stay</p>
                            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{day.accommodation}</p>
                          </div>
                        </div>
                      )}
                      {day.tips && (
                        <div className="flex items-start gap-2 p-2 bg-sky-500/5 rounded-lg border border-sky-500/15">
                          <Info className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-sky-200 leading-snug line-clamp-3">{day.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {segment.is_transfer_departure && (
        <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 inline-flex items-center gap-2">
          <Plane className="w-3.5 h-3.5 text-teal-300" />
          <span className="text-[11px] text-teal-200">Departure day — onward travel to next stop</span>
        </div>
      )}
    </div>
  );
}