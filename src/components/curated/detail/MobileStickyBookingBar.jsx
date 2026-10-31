import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { formatPerPerson } from "./helpers";

// Sticky mobile conversion bar — reveals after the user scrolls past the hero,
// keeps price + CTA always reachable. Desktop hidden.
export default function MobileStickyBookingBar({ trip, onSelect, selecting }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pp = formatPerPerson(trip);
  const priceLabel = pp ? `${pp.currency} ${pp.amount}` : trip?.price_display || "—";

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-curated-card border-t border-curated-border shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="shrink-0">
          <p className="text-[10px] text-curated-muted uppercase font-semibold">From</p>
          <p className="font-bold text-curated-heading text-sm">
            {priceLabel}
            {pp ? "/person" : ""}
          </p>
        </div>
        <button
          onClick={onSelect}
          disabled={selecting}
          className="flex-1 rounded-full bg-curated-accent text-curated-accent-fg font-bold text-sm py-3 hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
        >
          {selecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue with This Trip <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}