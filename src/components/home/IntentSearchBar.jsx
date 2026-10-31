import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import FlowLoadingBubble from "@/components/ai/FlowLoadingBubble";

// Floating dark pill search input. Delegates the actual lookup to the parent
// via onResult(term) — the parent owns the data-binding + LLM fallback logic.
export default function IntentSearchBar({ onResult }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term || loading) return;
    setLoading(true);
    try {
      // GA4 custom event for destination search from home search bar
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "destination_search", {
          search_term: term,
          source: "home_search_bar",
        });
      }
      await onResult(term);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 mt-6">
      <form onSubmit={submit} aria-label="Destination visa & safety search">
        <div className="relative flex items-center bg-[#1e293b] border border-white/10 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.35)] pl-5 pr-2 py-1">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Where are you heading next? (e.g. Oman, Japan)"
            className="flex-1 bg-transparent text-white placeholder:text-slate-500 text-sm outline-none px-3 py-2 min-w-0"
            aria-label="Search a destination"
          />
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="shrink-0 rounded-full bg-[#00E5CC] text-[#0a0f14] text-sm font-semibold px-4 py-2 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
          </button>
        </div>
      </form>
      <p className="text-center text-xs text-slate-500 mt-2">
        Instant visa requirements, safety ratings & travel advisories for any destination
      </p>
      {loading && (
        <div className="mt-3">
          <FlowLoadingBubble />
        </div>
      )}
    </div>
  );
}