import { useState } from "react";
import { Calendar } from "lucide-react";

// Shared start/end date picker for conversational flows.
// Computes the number of days from the date range and calls
// onConfirm(days, label, startDate, endDate).
// Replaces the old day-count chip selectors (1-3 days, 4-7 days, etc.)
// with a deterministic date-range → days calculation.
export default function DateRangeStep({
  onConfirm,
  startLabel = "Start date",
  endLabel = "End date",
  minStart,
  promptLabel,
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const minStartVal = minStart || today;
  const minEnd = start || minStartVal;

  const days = start && end
    ? Math.max(1, Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000))
    : 0;

  const canSubmit = start && end && days >= 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(days, `${days} day${days !== 1 ? "s" : ""}`, start, end);
  };

  return (
    <div className="space-y-3 pt-2">
      {promptLabel && <p className="text-xs text-white/50 px-1 lg:text-[#617084]">{promptLabel}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 lg:rounded-2xl lg:border-[#dbe4ef] lg:bg-white lg:px-5 lg:py-3.5">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <input
            type="date"
            value={start}
            min={minStartVal}
            onChange={(e) => setStart(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark] lg:text-[#102149] lg:[color-scheme:light]"
            aria-label={startLabel}
          />
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 lg:rounded-2xl lg:border-[#dbe4ef] lg:bg-white lg:px-5 lg:py-3.5">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <input
            type="date"
            value={end}
            min={minEnd}
            onChange={(e) => setEnd(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark] lg:text-[#102149] lg:[color-scheme:light]"
            aria-label={endLabel}
          />
        </div>
      </div>
      {canSubmit && (
        <p className="text-xs text-white/50 px-1 lg:text-[#617084]">
          {days} day{days !== 1 ? "s" : ""} total
        </p>
      )}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-full bg-primary text-primary-foreground font-medium py-2.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
