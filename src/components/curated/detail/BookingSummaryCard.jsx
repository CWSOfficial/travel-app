import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { formatPerPerson } from "./helpers";

// Prominent "From [price]/person" booking card. Renders as a floating card on
// desktop and inline (borderless) on mobile.
export default function BookingSummaryCard({ trip, onSelect, selecting, nights, mobile }) {
  const pp = formatPerPerson(trip);
  const priceLabel = pp ? `${pp.currency} ${pp.amount}` : trip?.price_display || "—";
  const isPerPerson = !!pp;
  const durationLine = trip?.days
    ? `${trip.days} Day${trip.days !== 1 ? "s" : ""}${
        nights != null ? ` • ${nights} Night${nights !== 1 ? "s" : ""}` : ""
      }`
    : null;

  const trustPoints = [
    "Operated by a local travel partner",
    trip?.cancellation_policy ? "Clear cancellation terms" : null,
    "Local support during your trip",
    "Booking & payment handled by the named operator",
  ].filter(Boolean);

  return (
    <div
      className={
        mobile
          ? "bg-transparent border-0 shadow-none p-0"
          : "rounded-2xl bg-curated-card border border-curated-border shadow-xl p-5 w-full max-w-xs"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-curated-muted">From</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="font-display text-3xl font-bold text-curated-heading">{priceLabel}</span>
        {isPerPerson && <span className="text-sm text-curated-muted">/ person</span>}
      </div>
      {durationLine && <p className="text-sm text-curated-text mt-2">{durationLine}</p>}

      <button
        onClick={onSelect}
        disabled={selecting}
        className="mt-4 w-full rounded-full bg-curated-accent text-curated-accent-fg font-bold text-sm py-3.5 hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
      >
        {selecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Continue with This Trip <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      <p className="text-[11px] text-curated-muted text-center mt-2">
        Continue free — no payment required yet.
      </p>

      <div className="mt-4 space-y-2">
        {trustPoints.map((t, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-curated-text">
            <CheckCircle2 className="w-4 h-4 text-curated-accent shrink-0 mt-0.5" /> {t}
          </div>
        ))}
      </div>
    </div>
  );
}