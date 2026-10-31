import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { CATEGORIES, ALL_ITEMS, TOTAL_ITEMS, ESIM_AFFILIATE_URL } from "@/lib/checklistData";
import { trackEvent } from "@/lib/analytics";
import { saveDashboardState, loadDashboardState } from "@/lib/tripDashboardStorage";

// Self-contained interactive checklist widget for the Prepare page.
// Persists to localStorage and syncs "pack" readiness to the Trip Dashboard.
export default function ChecklistWidget() {
  const [completion, setCompletion] = useState({});
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const storageKey = "dheevoy_checklist_prepare";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompletion(JSON.parse(saved));
    } catch { /* non-blocking */ }
  }, []);

  const syncCompletion = (next) => {
    setCompletion(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* non-blocking */ }
    const allChecked = ALL_ITEMS.every((item) => next[item.id]);
    const dashState = loadDashboardState();
    if (dashState) {
      const updatedReadiness = { ...(dashState.readiness || {}), pack: allChecked };
      saveDashboardState({ ...dashState, readiness: updatedReadiness });
    }
  };

  const toggleItem = (itemId) => {
    const next = { ...completion, [itemId]: !completion[itemId] };
    syncCompletion(next);
    trackEvent("prepare_checklist_item_toggled", { item: itemId, checked: !completion[itemId] });
  };

  const completedCount = ALL_ITEMS.filter((i) => completion[i.id]).length;
  const pct = Math.round((completedCount / TOTAL_ITEMS) * 100);
  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);
  const activeCatItems = activeCat.items;
  const activeCatDone = activeCatItems.filter((i) => completion[i.id]).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg font-bold">Interactive Travel Checklist</h3>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">{completedCount} of {TOTAL_ITEMS} items</span>
          <span className="text-xs font-semibold text-primary">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const catDone = cat.items.filter((i) => completion[i.id]).length;
          const catTotal = cat.items.length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[44px] ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{cat.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20" : "bg-muted"}`}>
                {catDone}/{catTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active category items */}
      <div className="space-y-2.5">
        {activeCatItems.map((item, i) => {
          const done = !!completion[item.id];
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => toggleItem(item.id)}
              className={`w-full text-left rounded-xl border p-3 transition-all min-h-[44px] ${
                done ? "bg-emerald-50/50 border-emerald-100" : "bg-muted/30 border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? "text-emerald-700" : ""}`}>{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {activeCatDone === activeCatItems.length
            ? `✅ ${activeCat.label} — all done!`
            : `${activeCatDone} of ${activeCatItems.length} checked`}
        </p>
        <a
          href={ESIM_AFFILIATE_URL}
          target="_blank"
          rel="nofollow sponsored"
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          Get eSIM →
        </a>
      </div>
    </div>
  );
}