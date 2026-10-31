import { motion } from "framer-motion";
import { ShieldCheck, Stamp, MapPin, Thermometer } from "lucide-react";

// Safety score → colour + label
function safetyMeta(score) {
  if (score == null) return { color: "#64748b", label: "Checking…", bg: "hsl(210 20% 14%)" };
  if (score >= 80) return { color: "#10b981", label: "Very Safe", bg: "hsl(150 25% 16%)" };
  if (score >= 65) return { color: "#84cc16", label: "Safe", bg: "hsl(90 20% 16%)" };
  if (score >= 45) return { color: "#f59e0b", label: "Moderate", bg: "hsl(38 30% 16%)" };
  if (score >= 25) return { color: "#f97316", label: "Use Caution", bg: "hsl(25 35% 16%)" };
  return { color: "#ef4444", label: "High Risk", bg: "hsl(0 25% 16%)" };
}

// Circular progress ring for the safety score
function SafetyRing({ score }) {
  const meta = safetyMeta(score);
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const pct = score != null ? Math.min(100, Math.max(0, score)) / 100 : 0;
  const offset = circ * (1 - pct);

  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(210 20% 18%)" strokeWidth="6" />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={meta.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-lg font-bold leading-none">{score ?? "—"}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">/ 100</p>
      </div>
    </div>
  );
}

export default function CommandBanner({ destination, preferences, isLoading }) {
  const destName = destination?.name || destination?.city || "Your destination";
  const country = destination?.full_location || "";
  const score = destination?.safety_index_score;
  const meta = safetyMeta(score);
  const visa = destination?.visa_requirement;
  const temp = destination?.temp_celsius;
  const weather = destination?.weather;
  const photo = destination?.destination_image_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-border lg:min-h-[260px] lg:rounded-[32px] lg:border-[#dce7f3] lg:shadow-[0_18px_48px_rgba(16,33,73,0.08)]"
    >
      {/* Image / gradient backdrop */}
      <div className="absolute inset-0">
        {photo ? (
          <img src={photo} alt={destName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#eaf7ff] via-white to-[#e8f7f7]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30 lg:bg-[linear-gradient(100deg,rgba(250,248,255,0.98)_0%,rgba(250,248,255,0.94)_54%,rgba(234,247,255,0.68)_100%)]" />
      </div>

      <div className="relative px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-9">
        <div className="flex items-start gap-4 justify-between flex-wrap">
          {/* Destination identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">{country || destName}</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight lg:text-[40px] lg:leading-tight lg:tracking-[-0.045em]">{destName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Visa badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isLoading && !visa ? "bg-muted animate-pulse" : "bg-primary/15 text-primary"
              }`}>
                <Stamp className="w-3.5 h-3.5" />
                {visa || (isLoading ? "Checking visa…" : "Visa info unavailable")}
              </div>
              {/* Temp badge */}
              {temp != null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  {Math.round(temp)}°C
                </div>
              )}
            </div>
            {weather && <p className="text-xs text-muted-foreground mt-2 max-w-md">{weather}</p>}
          </div>

          {/* Safety ring */}
          <div className="flex flex-col items-center gap-1.5 lg:rounded-3xl lg:border lg:border-white lg:bg-white/80 lg:px-5 lg:py-4 lg:shadow-[0_8px_24px_rgba(16,33,73,0.07)]">
            <SafetyRing score={score} />
            <span className="text-xs font-semibold" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
        </div>

        {/* Trip meta strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground lg:mt-6 lg:pt-5 lg:text-sm">
          <span>From <strong className="text-foreground">{preferences?.departure_city}</strong></span>
          <span>·</span>
          <span><strong className="text-foreground">{preferences?.duration_days}</strong> days</span>
          <span>·</span>
          <span className="capitalize"><strong className="text-foreground">{preferences?.budget?.replace("_", " ")}</strong></span>
          <span>·</span>
          <span className="capitalize">{preferences?.travel_style}</span>
          {destination?.total_cost && (
            <>
              <span>·</span>
              <span>Est. <strong className="text-primary">{destination.total_cost}</strong></span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
