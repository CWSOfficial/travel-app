import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ChevronRight, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { flagEmoji, visaBadge, cleanCountryName } from "@/lib/flagEmoji";
import { getDestinationPhoto } from "@/lib/destinationPhotos";

// Homepage "Popular Destinations" section — expanded card layout with real
// photos, visa status and safety scores from DestinationSafetyCache.
// Grid layout: 2 cols on mobile, 3-4 on desktop. Never fabricates data.
export default function NearbyPreview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState({});

  useEffect(() => {
    let active = true;
    base44.entities.DestinationSafetyCache.list("-last_updated", 8)
      .then((rows) => active && setItems(rows || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const scoreColor = (score) => {
    if (score == null) return { text: "text-slate-400", bar: "bg-slate-500" };
    if (score >= 70) return { text: "text-emerald-400", bar: "bg-emerald-500" };
    if (score >= 50) return { text: "text-yellow-400", bar: "bg-yellow-500" };
    if (score >= 30) return { text: "text-orange-400", bar: "bg-orange-500" };
    return { text: "text-red-400", bar: "bg-red-500" };
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12 w-full lg:rounded-[2rem] lg:border lg:border-white/90 lg:bg-white/65 lg:p-7 xl:p-8 lg:shadow-[0_12px_36px_rgba(16,33,73,0.07)] lg:backdrop-blur-sm" aria-label="Popular destinations">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2 lg:text-2xl">
          <MapPin className="w-5 h-5 text-primary" /> Popular Destinations
        </h3>
        <Link to="/nearby" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:opacity-80 transition-opacity">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-white border border-border animate-pulse" />
        ))}

        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 col-span-full text-center">No destinations cached yet — try a search above.</p>
        )}

        {!loading && items.map((it, i) => {
          const badge = visaBadge(it.visa_status, true);
          const photo = getDestinationPhoto(it.country_code, i);
          const sc = scoreColor(it.safety_index_score);
          const destName = cleanCountryName(it.country_name) || it.country_code;
          return (
            <Link
              key={it.id}
              to={`/nearby?destination=${encodeURIComponent(destName)}`}
              className="group relative h-40 lg:h-48 rounded-2xl lg:rounded-3xl overflow-hidden border border-white/10 shadow-[0_6px_18px_rgba(16,33,73,0.10)] hover:border-white/60 hover:shadow-[0_14px_30px_rgba(16,33,73,0.18)] hover:-translate-y-0.5 cursor-pointer transition-all duration-300"
            >
              {/* Photo background */}
              {!imgErrors[it.id] ? (
                <img
                  src={photo}
                  alt={cleanCountryName(it.country_name) || it.country_code}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() => setImgErrors((prev) => ({ ...prev, [it.id]: true }))}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <span className="text-5xl">{flagEmoji(it.country_code)}</span>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between">
                {/* Top: flag + country name */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xl leading-none">{flagEmoji(it.country_code)}</span>
                  <span className="text-sm font-semibold text-white truncate drop-shadow-lg">
                    {cleanCountryName(it.country_name) || it.country_code}
                  </span>
                </div>

                {/* Bottom: visa badge + safety score */}
                <div className="space-y-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text} backdrop-blur-sm`}>
                    {badge.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Shield className={`w-3.5 h-3.5 ${sc.text}`} />
                    <span className="text-xs font-semibold text-white">
                      Safety {it.safety_index_score ?? "—"}/100
                    </span>
                  </div>
                  {it.safety_index_score != null && (
                    <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className={`h-full ${sc.bar}`}
                        style={{ width: `${Math.min(100, it.safety_index_score)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
