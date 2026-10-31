import { Sparkles, AlertCircle, Clock, Moon, MapPin, Plane, Heart } from "lucide-react";

// Journey Intelligence summary card — deterministic (no AI). Surfaces the
// computed pace label, an explanatory sentence, "best for" guidance, and a
// "watch out" note. Replaces the old "Pace: Moderate" line.
const LEVEL_STYLE = {
  0: { badge: "bg-emerald-500/20 text-emerald-300", ring: "border-emerald-500/25" },
  1: { badge: "bg-teal-500/20 text-teal-300", ring: "border-teal-500/25" },
  2: { badge: "bg-amber-500/20 text-amber-300", ring: "border-amber-500/25" },
  3: { badge: "bg-rose-500/20 text-rose-300", ring: "border-rose-500/25" },
};

export default function JourneyIntelligenceCard({ intelligence, metrics, travellers }) {
  if (!intelligence) return null;
  const style = LEVEL_STYLE[intelligence.level] || LEVEL_STYLE[1];

  return (
    <div className={`rounded-2xl border ${style.ring} bg-white/5 p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-teal-400" /> Journey Intelligence
        </p>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${style.badge}`}>{intelligence.label}</span>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 inline-flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-400 leading-none">Duration</p>
            <p className="text-xs font-semibold text-white leading-tight">{metrics?.totalDays || 0} days</p>
          </div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 inline-flex items-center gap-2">
          <Moon className="w-3.5 h-3.5 text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-400 leading-none">Nights</p>
            <p className="text-xs font-semibold text-white leading-tight">{metrics?.totalNights || 0}</p>
          </div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 inline-flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-400 leading-none">Destinations</p>
            <p className="text-xs font-semibold text-white leading-tight">{metrics?.destinationCount || 0}</p>
          </div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 inline-flex items-center gap-2">
          <Plane className="w-3.5 h-3.5 text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-400 leading-none">Transfers</p>
            <p className="text-xs font-semibold text-white leading-tight">{metrics?.transferLegs || 0}</p>
          </div>
        </div>
      </div>

      {intelligence.explanation && (
        <p className="text-xs text-slate-200 leading-relaxed">{intelligence.explanation}</p>
      )}

      {intelligence.bestFor && (
        <p className="text-xs text-slate-300 inline-flex items-start gap-1.5">
          <Heart className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
          <span><span className="font-semibold text-teal-300">Best for: </span>{intelligence.bestFor}</span>
        </p>
      )}

      {intelligence.watchOut && (
        <p className="text-xs text-amber-300 inline-flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span><span className="font-semibold">Watch out: </span>{intelligence.watchOut}</span>
        </p>
      )}
    </div>
  );
}