import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Responsive gallery using ONLY existing package photos. Desktop: 4-image grid
// with "+N photos" overlay. Mobile: swipeable carousel with dots + arrows.
// Gracefully no-ops when there are no photos (handled by the page).
export default function DestinationGallery({ photos }) {
  const list = photos || [];
  const [idx, setIdx] = useState(0);
  if (list.length === 0) return null;
  const touchStartX = (e) => e.touches[0].clientX;
  let startX = 0;

  const next = () => setIdx((idx + 1) % list.length);
  const prev = () => setIdx((idx - 1 + list.length) % list.length);

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <h2 className="font-display text-xl font-bold text-curated-heading mb-4">Destination Gallery</h2>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-4 gap-3">
        {list.slice(0, 4).map((p, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-curated-surface">
            <img src={p} alt="" className="w-full h-full object-cover" />
            {i === 3 && list.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                +{list.length - 4} photos
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile swipeable carousel */}
      <div
        className="md:hidden relative rounded-xl overflow-hidden bg-curated-surface"
        onTouchStart={(e) => (startX = touchStartX(e))}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        }}
      >
        <div className="aspect-[4/3]">
          <img src={list[idx]} alt="" className="w-full h-full object-cover" />
        </div>
        {list.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5 text-curated-heading" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5 text-curated-heading" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {list.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}