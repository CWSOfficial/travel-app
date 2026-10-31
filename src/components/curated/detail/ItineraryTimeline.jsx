import { useState } from "react";
import { ChevronDown, CheckCircle2, Bed, Utensils } from "lucide-react";
import { parseItinerary, assignDayImages } from "./helpers";

// Shared "Detailed Itinerary" component — applies to ALL curated-trip packages.
// Vertical timeline with circular day badges, an image on every day,
// bullet-point activities, and stay/meals metadata. Day 1 starts expanded;
// all others start collapsed but keep their image visible.
export default function ItineraryTimeline({ trip }) {
  const days = trip?.itinerary_days || [];
  const [open, setOpen] = useState(0);
  if (days.length === 0) return null;

  const dayImages = assignDayImages(days.length, trip?.photos);

  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <h2 className="font-display text-xl font-bold text-curated-heading mb-5">Detailed Itinerary</h2>

      {/* Desktop / tablet timeline */}
      <div className="hidden sm:block relative pl-16">
        <div className="absolute left-6 top-7 bottom-7 w-px bg-curated-border" />
        {days.map((d, i) => {
          const dayNum = d.day || i + 1;
          const isOpen = open === i;
          const img = dayImages[i];
          const { bullets, stay, meals } = parseItinerary(d.description);
          return (
            <div key={i} className="relative mb-4 last:mb-0">
              {/* Circular day badge */}
              <div className="absolute -left-16 top-3 w-12 h-12 rounded-full bg-curated-heading text-white flex items-center justify-center text-[11px] font-bold leading-none z-10 ring-4 ring-curated-bg">
                <span className="text-center">Day<br />{dayNum}</span>
              </div>
              <div className="rounded-xl bg-curated-card border border-curated-border overflow-hidden hover:border-curated-accent/40 transition">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 p-3.5 text-left"
                >
                  <div className="shrink-0 w-44 h-28 rounded-lg overflow-hidden bg-curated-surface">
                    {img && (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-curated-heading leading-snug">
                      {d.title || `Day ${dayNum}`}
                    </p>
                    {!isOpen && bullets.length > 0 && (
                      <p className="text-xs text-curated-muted mt-1 line-clamp-2">
                        {bullets[0]}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-curated-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-4 pl-[206px]">
                    {bullets.length > 0 && (
                      <ul className="space-y-1.5">
                        {bullets.map((b, j) => (
                          <li key={j} className="flex gap-2 text-sm text-curated-text leading-relaxed">
                            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-curated-accent shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(stay || meals) && (
                      <div className="mt-3.5 space-y-1.5">
                        {stay && (
                          <p className="flex items-start gap-2 text-sm text-curated-text">
                            <Bed className="w-4 h-4 text-curated-accent shrink-0 mt-0.5" />
                            <span><span className="font-semibold text-curated-heading">Stay:</span> {stay}</span>
                          </p>
                        )}
                        {meals && (
                          <p className="flex items-start gap-2 text-sm text-curated-text">
                            <Utensils className="w-4 h-4 text-curated-accent shrink-0 mt-0.5" />
                            <span>{meals}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {d.included && (
                      <span className="inline-flex items-center gap-1 text-xs text-curated-accent mt-3.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Included in package
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile accordion (< 640px) */}
      <div className="sm:hidden space-y-2.5">
        {days.map((d, i) => {
          const dayNum = d.day || i + 1;
          const isOpen = open === i;
          const img = dayImages[i];
          const { bullets, stay, meals } = parseItinerary(d.description);
          return (
            <div key={i} className="rounded-xl bg-curated-card border border-curated-border overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2.5 p-2.5 text-left"
              >
                <div className="shrink-0 w-11 h-11 rounded-full bg-curated-heading text-white flex items-center justify-center text-[10px] font-bold leading-none text-center">
                  Day<br />{dayNum}
                </div>
                <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-curated-surface">
                  {img && (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-curated-heading text-sm leading-snug">
                    {d.title || `Day ${dayNum}`}
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-curated-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-1">
                  {bullets.length > 0 && (
                    <ul className="space-y-1.5">
                      {bullets.map((b, j) => (
                        <li key={j} className="flex gap-2 text-sm text-curated-text leading-relaxed">
                          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-curated-accent shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(stay || meals) && (
                    <div className="mt-3 space-y-1.5">
                      {stay && (
                        <p className="flex items-start gap-2 text-sm text-curated-text">
                          <Bed className="w-4 h-4 text-curated-accent shrink-0 mt-0.5" />
                          <span><span className="font-semibold text-curated-heading">Stay:</span> {stay}</span>
                        </p>
                      )}
                      {meals && (
                        <p className="flex items-start gap-2 text-sm text-curated-text">
                          <Utensils className="w-4 h-4 text-curated-accent shrink-0 mt-0.5" />
                          <span>{meals}</span>
                        </p>
                      )}
                    </div>
                  )}
                  {d.included && (
                    <span className="inline-flex items-center gap-1 text-xs text-curated-accent mt-3">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Included in package
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}