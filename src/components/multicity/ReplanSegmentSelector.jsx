import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, MapPin, Calendar, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { formatDateShort, daysBetween } from "@/lib/journeyContext";

// Re-plan segment selector — shows ALL eligible TripSegments so the user can
// choose which stop to re-plan from, instead of auto-assuming the first/open
// destination. Completed/confirmed segments are shown but locked. Requires
// explicit confirmation before any regeneration.
//
// Rules:
//   - Selecting segment N preserves segments 0..N-1 exactly.
//   - Completed segments (segment_status === "completed") are never eligible.
//   - Confirmation prompt: "Re-plan from <city> onwards? Earlier journey
//     segments will stay unchanged."
export default function ReplanSegmentSelector({ segments, onReplan, isGenerating, onCancel }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [confirming, setConfirming] = useState(null);

  if (!segments || segments.length === 0) return null;

  const ordered = [...segments].sort((a, b) => a.sequence_number - b.sequence_number);

  const statusMeta = (seg) => {
    const status = seg.segment_status || "planned";
    if (status === "completed" || status === "confirmed") {
      return { label: "Completed", icon: CheckCircle2, color: "text-emerald-300", locked: true };
    }
    if (status === "active") {
      return { label: "Active", icon: Clock, color: "text-teal-300", locked: false };
    }
    if (status === "upcoming") {
      return { label: "Upcoming", icon: Clock, color: "text-sky-300", locked: false };
    }
    return { label: "Planned", icon: MapPin, color: "text-slate-300", locked: false };
  };

  const handleSelect = (i) => {
    const seg = ordered[i];
    const meta = statusMeta(seg);
    if (meta.locked) return;
    setSelectedIdx(i);
    setConfirming(i);
  };

  const handleConfirm = () => {
    if (confirming == null) return;
    onReplan(confirming);
    setConfirming(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
        <RefreshCw className="w-4 h-4 text-teal-400" /> Where would you like to re-plan from?
      </p>

      <div className="space-y-1.5">
        {ordered.map((seg, i) => {
          const meta = statusMeta(seg);
          const StatusIcon = meta.icon;
          const isSelected = selectedIdx === i;
          const nights =
            seg.nights != null
              ? seg.nights
              : seg.arrival_date && seg.departure_date
                ? daysBetween(seg.arrival_date, seg.departure_date)
                : null;
          const destFull = seg.destination_full || seg.destination_city || seg.destination;

          return (
            <div key={seg.id || i}>
              <button
                onClick={() => handleSelect(i)}
                disabled={meta.locked || isGenerating}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors min-h-[52px] ${
                  isSelected
                    ? "border-teal-500/50 bg-teal-500/15"
                    : meta.locked
                      ? "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed"
                      : "border-white/10 bg-white/5 hover:border-teal-500/30"
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {seg.sequence_number || i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{destFull}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {seg.arrival_date ? formatDateShort(seg.arrival_date) : ""}
                    {seg.departure_date ? ` – ${formatDateShort(seg.departure_date)}` : ""}
                    {nights != null ? ` · ${nights}n` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium shrink-0 ${meta.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" /> {meta.label}
                </span>
              </button>

              {/* Confirmation prompt inline under the selected segment */}
              {confirming === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-1.5 ml-4 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 space-y-2.5"
                >
                  <p className="text-xs text-amber-200 inline-flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      Re-plan from <span className="font-semibold text-white">{destFull}</span> onwards?
                      Earlier journey segments will stay unchanged. Confirmed bookings are never modified.
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={isGenerating}
                      className="flex-1 rounded-lg border border-teal-500/30 bg-teal-500/15 text-teal-300 text-xs font-medium py-2.5 min-h-[40px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Yes, re-plan
                    </button>
                    <button
                      onClick={() => {
                        setConfirming(null);
                        setSelectedIdx(null);
                        if (onCancel) onCancel();
                      }}
                      className="rounded-lg border border-white/10 text-slate-300 text-xs px-3 py-2.5 min-h-[40px]"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Non-destructive: completed segments and confirmed bookings are never modified. Only the selected stop and later stops are regenerated.
      </p>
    </div>
  );
}