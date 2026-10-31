import { ShieldCheck, ClipboardList, ArrowRight, MapPin } from "lucide-react";

// Success state shown ONLY after a successful receipt upload / booking submission.
// Reveals the Travel Checklist link (kept out of Steps 1–3 to avoid distraction).
export default function BookingConfirmation({ bookingRef, message, onPrepare, onNearby }) {
  return (
    <div className="rounded-2xl bg-curated-card border-2 border-curated-accent/40 p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-xl bg-curated-accent/15 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-curated-accent" />
        </div>
        <div>
          <h3 className="font-bold text-curated-heading">Booking request submitted</h3>
          <p className="text-xs text-curated-muted">Your operator will confirm your payment shortly.</p>
        </div>
      </div>
      <div className="rounded-xl bg-curated-surface border border-curated-border p-3 mb-3">
        <p className="text-[10px] uppercase tracking-wider text-curated-muted font-semibold">Booking Reference</p>
        <p className="text-lg font-bold tracking-wider text-curated-heading mt-0.5">{bookingRef}</p>
      </div>
      <p className="text-xs text-curated-text mb-4 leading-relaxed">{message}</p>
      <button
        onClick={onPrepare}
        className="w-full rounded-full bg-curated-accent text-curated-accent-fg font-bold text-sm py-3.5 hover:opacity-90 transition flex items-center justify-center gap-2 mb-2 min-h-[48px]"
      >
        <ClipboardList className="w-4 h-4" /> Prepare for Your Trip <ArrowRight className="w-4 h-4" />
      </button>
      <button
        onClick={onNearby}
        className="w-full py-2 text-xs text-curated-muted hover:text-curated-heading transition flex items-center justify-center gap-1.5"
      >
        <MapPin className="w-3.5 h-3.5" /> Explore Nearby Attractions
      </button>
    </div>
  );
}