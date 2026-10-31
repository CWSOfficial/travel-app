import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { searchLocalInstant, searchGlobalDestinations } from "@/lib/destinationSearch";
import { base44 } from "@/api/base44Client";

// Global destination autocomplete.
// Shows instant local results, then after a 350ms debounce fetches Mapbox
// geocoding results via the searchDestinationsGlobal backend function and
// merges them in. Successful Mapbox queries are cached in localStorage.
//
// Props:
//   value, onChange (string label), placeholder, className, countriesOnly
//   onSelect (string label) — backward-compatible selection callback
//   onSelectDestination (structured result) — receives { label, city, country,
//     country_code, lat, lng, place_id, type } for coordinate reuse + storage

// Log zero-result search to DestinationSearchGap entity (debounced, best-effort)
async function logZeroResult(term) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await base44.entities.DestinationSearchGap
      .filter({ search_term: term.trim() })
      .catch(() => []);

    if (existing.length > 0) {
      await base44.entities.DestinationSearchGap.update(existing[0].id, {
        search_count: (existing[0].search_count || 1) + 1,
        last_searched: today,
      }).catch(() => {});
    } else {
      await base44.entities.DestinationSearchGap.create({
        search_term: term.trim(),
        search_count: 1,
        first_searched: today,
        last_searched: today,
        status: "missing",
      }).catch(() => {});
    }
  } catch {
    // Silently ignore — non-blocking
  }
}

const TYPE_LABELS = {
  country: "Country",
  region: "Region",
  place: "City",
  locality: "Locality",
  district: "District",
  neighborhood: "Area",
};

export default function LocationAutocomplete({ value, onChange, placeholder, className, countriesOnly = false, onSelect, onSelectDestination }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef(null);
  const zeroResultTimerRef = useRef(null);
  const debounceRef = useRef(null);
  const queryRef = useRef("");

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const q = query.trim();
    queryRef.current = q;
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }

    // 1. Instant local results (static list + countries)
    const local = searchLocalInstant(q, countriesOnly);
    setSuggestions(local);
    // Keep dropdown open even when local results are empty — the "searching…"
    // indicator and Mapbox results will appear after debounce.
    setOpen(true);
    setActiveIdx(-1);

    // 2. Debounced global search (Mapbox via backend function)
    if (q.length < 3) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const all = await searchGlobalDestinations(q, countriesOnly);
        // Only update if the query hasn't changed while we were searching
        if (queryRef.current === q) {
          setSuggestions(all);
          setOpen(all.length > 0);
          setActiveIdx(-1);

          if (all.length === 0) {
            clearTimeout(zeroResultTimerRef.current);
            zeroResultTimerRef.current = setTimeout(() => {
              if (queryRef.current === q && q.length >= 3) logZeroResult(q);
            }, 800);
          } else {
            clearTimeout(zeroResultTimerRef.current);
          }
        }
      } catch {
        // Keep local results on Mapbox error — don't break the UX
      } finally {
        if (queryRef.current === q) setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query, countriesOnly]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (item) => {
    const label = typeof item === "string" ? item : item.label;
    setQuery(label);
    onChange(label);
    if (onSelect) onSelect(label);
    if (onSelectDestination && typeof item === "object") onSelectDestination(item);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          autoComplete="off"
          className={`w-full pl-10 pr-10 h-12 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all ${className || ""}`}
        />
        {isSearching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((item, i) => {
            const label = typeof item === "string" ? item : item.label;
            const typeLabel = typeof item === "object" ? TYPE_LABELS[item.type] || "" : "";
            const countryCode = typeof item === "object" ? item.country_code : "";
            return (
              <li
                key={`${label}-${i}`}
                onMouseDown={() => select(item)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer transition-colors ${i === activeIdx ? "bg-black text-white" : "hover:bg-muted/60 text-foreground"}`}
              >
                <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${i === activeIdx ? "text-white/70" : "text-muted-foreground"}`} />
                <span className="flex-1 truncate">{label}</span>
                {typeLabel && (
                  <span className={`text-[10px] uppercase tracking-wider flex-shrink-0 ${i === activeIdx ? "text-white/60" : "text-muted-foreground"}`}>
                    {typeLabel}
                  </span>
                )}
                {countryCode && (
                  <span className={`text-xs flex-shrink-0 ${i === activeIdx ? "text-white/60" : "text-muted-foreground"}`}>
                    {countryCode}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && suggestions.length === 0 && isSearching && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-xl shadow-xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching destinations…
        </div>
      )}
    </div>
  );
}