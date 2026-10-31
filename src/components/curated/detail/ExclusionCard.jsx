import { MinusCircle } from "lucide-react";
import { parseBullets } from "./helpers";

// Exclusions — visually secondary to inclusions. Neutral styling, small icons.
export default function ExclusionCard({ trip }) {
  const items = parseBullets(trip?.exclusions);
  if (items.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="rounded-2xl bg-curated-surface border border-curated-border p-5 md:p-6">
        <h2 className="font-display text-lg font-bold text-curated-heading mb-3">Not Included</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <MinusCircle className="w-4 h-4 text-curated-muted shrink-0 mt-0.5" />
              <span className="text-sm text-curated-muted">{it}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-curated-muted mt-4 italic">
          Any optional experiences mentioned in the itinerary cost extra and are paid locally.
        </p>
      </div>
    </section>
  );
}