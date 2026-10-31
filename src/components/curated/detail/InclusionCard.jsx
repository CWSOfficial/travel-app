import { CheckCircle2 } from "lucide-react";
import { parseBullets } from "./helpers";

// Positive, prominent inclusions card. Values come from package data only.
export default function InclusionCard({ trip }) {
  const items = parseBullets(trip?.inclusions);
  if (items.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="rounded-2xl bg-curated-card border border-curated-border p-5 md:p-6">
        <h2 className="font-display text-xl font-bold text-curated-heading mb-1">What's Included</h2>
        <p className="text-sm text-curated-muted mb-4">Everything below is part of your package price.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-curated-accent shrink-0 mt-0.5" />
              <span className="text-sm text-curated-text">{it}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}