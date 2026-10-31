import { buildHighlights } from "./helpers";

// Visual highlight cards derived from package tags (fallback to itinerary
// titles). No hard-coded destination content.
export default function TripHighlights({ trip }) {
  const highlights = buildHighlights(trip);
  if (highlights.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <h2 className="font-display text-xl font-bold text-curated-heading mb-4">Trip Highlights</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {highlights.map((h, i) => (
          <div
            key={i}
            className="rounded-xl bg-curated-surface border border-curated-border p-4 flex flex-col items-start gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-curated-accent/15 flex items-center justify-center">
              <h.icon className="w-5 h-5 text-curated-accent" />
            </div>
            <p className="text-sm font-semibold text-curated-heading leading-snug">{h.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}