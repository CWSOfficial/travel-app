import { motion } from "framer-motion";
import { Stamp, Plane, BedDouble, Wifi, Backpack, Check } from "lucide-react";

export const READINESS_ITEMS = [
  { id: "visa", label: "Visa Verified", icon: Stamp },
  { id: "flight", label: "Flight Tracked", icon: Plane },
  { id: "stay", label: "Stay Booked", icon: BedDouble },
  { id: "esim", label: "eSIM Ready", icon: Wifi },
  { id: "pack", label: "Pack List", icon: Backpack },
];

export default function TripReadinessBar({ readiness, onToggle, onAction }) {
  const done = READINESS_ITEMS.filter((i) => readiness?.[i.id]).length;
  const pct = Math.round((done / READINESS_ITEMS.length) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 lg:rounded-[26px] lg:border-[#e3eaf3] lg:bg-white lg:p-6 lg:shadow-[0_10px_30px_rgba(16,33,73,0.055)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">Trip Readiness</h4>
          <p className="text-[11px] text-muted-foreground">{done}/{READINESS_ITEMS.length} ready · {pct}%</p>
        </div>
        <span className={`text-sm font-bold ${pct === 100 ? "text-emerald-400" : "text-primary"}`}>
          {pct === 100 ? "All set! 🎉" : `${pct}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Item chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 lg:gap-3">
        {READINESS_ITEMS.map((item) => {
          const isDone = !!readiness?.[item.id];
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => (item.id === "esim" || item.id === "pack" ? onAction(item.id) : onToggle(item.id))}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all min-h-[60px] lg:min-h-[94px] lg:justify-center lg:rounded-2xl lg:p-3 ${
                isDone ? "border-emerald-500/40 bg-emerald-500/10" : "border-border hover:border-primary/40"
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDone ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${isDone ? "text-emerald-400" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
