import { ShieldCheck } from "lucide-react";

// Reassurance card showing the real stored cancellation policy only.
export default function CancellationCard({ trip }) {
  if (!trip?.cancellation_policy) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="rounded-2xl bg-curated-card border border-curated-border p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-curated-accent" />
          <h2 className="font-display text-lg font-bold text-curated-heading">Cancellation Policy</h2>
        </div>
        <p className="text-sm text-curated-text leading-relaxed whitespace-pre-wrap">
          {trip.cancellation_policy}
        </p>
      </div>
    </section>
  );
}