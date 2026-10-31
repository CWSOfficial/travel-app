import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { flagEmoji, visaBadge, cleanCountryName } from "@/lib/flagEmoji";

export default function TrendingVisaRules({ onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Mouse drag scroll refs ──────────────────────────
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    let active = true;
    base44.entities.DestinationSafetyCache.list("-last_updated", 12)
      .then((rows) => active && setItems(rows || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  // ── Mouse drag handlers ─────────────────────────────
  const onMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.style.userSelect = "none";
  };

  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "";
    }
  };

  const onMouseLeave = () => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "";
    }
  };

  return (
    // FIX 1: removed overflow-hidden — it was clipping the scroll container
    <section
      className="max-w-5xl mx-auto px-4 mt-8 w-full"
      aria-label="Trending visa rules"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-bold text-white">
          Trending Visa Rules
        </h3>
        {/* Updated hint to cover both mouse and touch */}
        <span className="text-xs text-slate-400">Drag or swipe →</span>
      </div>

      {/* FIX 2: added ref + all mouse drag event handlers */}
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className="flex flex-row overflow-x-scroll snap-x snap-mandatory space-x-4 w-full pb-3 touch-pan-x min-w-0"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: "grab",
        }}
      >
        {/* Hide scrollbar cross-browser */}
        <style>{`
          .trending-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[180px] h-[135px] rounded-xl bg-[#1e293b] animate-pulse"
            />
          ))}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500 py-6">
            No trending rules yet — try a search above.
          </p>
        )}

        {!loading &&
          items.map((it) => {
            const badge = visaBadge(it.visa_status, true);
            return (
              <div
                key={it.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  // Only fire click if not dragging
                  if (!isDragging.current) onSelect(it);
                }}
                onKeyDown={(e) => e.key === "Enter" && onSelect(it)}
                className="flex-shrink-0 w-[180px] snap-start text-left rounded-xl bg-[#1e293b] border border-white/10 p-3 hover:border-[#00E5CC]/50 transition-colors select-none"
                style={{ cursor: "inherit" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl leading-none">
                    {flagEmoji(it.country_code)}
                  </span>
                  <span className="text-sm font-semibold text-white truncate">
                    {cleanCountryName(it.country_name) || it.country_code}
                  </span>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-white/5">
                  <span>Safety {it.safety_index_score ?? "—"}/100</span>
                  <span className="text-slate-500">
                    Best {it.best_months || "—"}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}