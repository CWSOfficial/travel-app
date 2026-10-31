import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { flagEmoji, visaBadge, cleanCountryName, humanizeAdvisory } from "@/lib/flagEmoji";

function AdvisoryList({ data }) {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 8);
  if (entries.length === 0) return null;
  return (
    <dl className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k.replace(/_/g, " ")}</dt>
          <dd className="text-sm text-slate-200 leading-relaxed">{humanizeAdvisory(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

// Bottom-sheet (mobile) / centred (desktop) drawer showing full visa + safety detail.
export default function VisaRuleDrawer({ item, onClose }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#0f172a] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{flagEmoji(item.country_code)}</span>
                <div>
                  <h3 className="font-display text-xl font-bold text-white leading-tight">
                    {cleanCountryName(item.country_name) || item.country || "Destination"}
                  </h3>
                  {item.region && <p className="text-xs text-slate-400">{item.region}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(() => {
                const isUkFcdo = !!item.dynamic_advisories;
                const badge = visaBadge(item.visa_status, isUkFcdo);
                return (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                );
              })()}
              {item.visa_free_days ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200">
                  {item.visa_free_days} days free
                </span>
              ) : null}
              {item.best_months ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300">
                  Best: {item.best_months}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {item.safety_index_score ?? "—"}
                  <span className="text-sm text-slate-400">/100</span>
                </p>
                <p className="text-xs text-slate-400">Safety index score</p>
              </div>
            </div>

            {item.critical_advisories_text && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">Key advisories</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{item.critical_advisories_text}</p>
              </div>
            )}

            {item.scams && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-300">Common scams &amp; risks</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{item.scams}</p>
              </div>
            )}

            {item.dynamic_advisories && typeof item.dynamic_advisories === "object" && (
              <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-300 mb-2">Advisory details</p>
                <AdvisoryList data={item.dynamic_advisories} />
              </div>
            )}

            <p className="text-[10px] text-slate-500 leading-relaxed">
              This is AI-generated guidance. Always verify visa requirements with the official embassy and
              check related government foreign-travel-advice before travelling.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}