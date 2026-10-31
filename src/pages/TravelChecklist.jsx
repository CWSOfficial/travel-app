import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Circle, ArrowLeft, Loader2, MapPin,
  ArrowRight, Info,
} from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import { saveDashboardState, loadDashboardState } from "@/lib/tripDashboardStorage";
import { CATEGORIES, ALL_ITEMS, TOTAL_ITEMS, ESIM_AFFILIATE_URL } from "@/lib/checklistData";

export default function TravelChecklist() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = params.get("trip");
  const guestTripDetails = location.state?.tripDetails;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState({});
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const storageKey = `dheevoy_checklist_${tripId || "guest"}`;

  // ── Load trip + saved checklist ──
  useEffect(() => {
    // Load checklist completion from localStorage first (instant)
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompletion(JSON.parse(saved));
    } catch { /* non-blocking */ }

    if (!tripId) {
      if (guestTripDetails) setTrip(guestTripDetails);
      setLoading(false);
      return;
    }
    base44.entities.Trip.get(tripId)
      .then(async (t) => {
        setTrip(t);
        // Merge DB-saved checklist completion with localStorage
        if (t.checklist_completion) {
          setCompletion((prev) => ({ ...prev, ...t.checklist_completion }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId, guestTripDetails, storageKey]);

  // ── Sync completion to localStorage + dashboard readiness ──
  const syncCompletion = (next) => {
    setCompletion(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* non-blocking */ }

    // Sync "pack" readiness to the Trip Dashboard state in localStorage
    const allChecked = ALL_ITEMS.every((item) => next[item.id]);
    const dashState = loadDashboardState();
    if (dashState) {
      const updatedReadiness = { ...(dashState.readiness || {}), pack: allChecked };
      saveDashboardState({ ...dashState, readiness: updatedReadiness });
    }

    // Also persist to DB if we have a tripId
    if (tripId) {
      base44.entities.Trip.update(tripId, { checklist_completion: next }).catch(() => {});
    }
  };

  const toggleItem = (itemId) => {
    const next = { ...completion, [itemId]: !completion[itemId] };
    syncCompletion(next);
    trackEvent("checklist_item_toggled", { item: itemId, checked: !completion[itemId] });
  };

  const completedCount = ALL_ITEMS.filter((i) => completion[i.id]).length;
  const pct = Math.round((completedCount / TOTAL_ITEMS) * 100);
  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);
  const activeCatItems = activeCat.items;
  const activeCatDone = activeCatItems.filter((i) => completion[i.id]).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
        <BottomNav active="/plan" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-bold text-lg mb-2">No trip selected</h2>
          <p className="text-sm text-muted-foreground mb-5">Plan a trip first to build your travel checklist.</p>
          <Link to="/plan" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold">
            Plan a Trip →
          </Link>
        </div>
        <BottomNav active="/plan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/trip-dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Trip Dashboard
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
              Self-Planned
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Travel Checklist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {trip.selected_destination || "Your trip"} · {completedCount} of {TOTAL_ITEMS} items packed
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">{pct}% complete · syncs to your Trip Readiness bar</p>
        </div>

        {/* Skip to Nearby Attractions — always available so users are never trapped */}
        <Link
          to={`/nearby?destination=${encodeURIComponent(trip.selected_destination || "")}`}
          onClick={() => trackEvent("checklist_skip_to_nearby", { destination: trip.selected_destination })}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] mb-4"
        >
          <MapPin className="w-4 h-4" /> Skip to Nearby Attractions <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const catDone = cat.items.filter((i) => completion[i.id]).length;
            const catTotal = cat.items.length;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{cat.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {catDone}/{catTotal}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active category items */}
        <div className="space-y-3">
          {activeCatItems.map((item, i) => {
            const done = !!completion[item.id];
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => toggleItem(item.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-all min-h-[44px] ${
                  done ? "bg-emerald-50/50 border-emerald-100" : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
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

        {/* Category progress + eSIM link */}
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-muted/40 border border-border p-4 text-center">
            <p className="text-sm font-semibold mb-1">
              {activeCatDone === activeCatItems.length
                ? `✅ ${activeCat.label} — all done!`
                : `${activeCatDone} of ${activeCatItems.length} checked in ${activeCat.label}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount === TOTAL_ITEMS
                ? "All checklist items complete — your Trip Readiness is fully packed!"
                : "Check items across all categories to complete your Trip Readiness."}
            </p>
          </div>

          {/* eSIM quick link */}
          <a
            href={ESIM_AFFILIATE_URL}
            target="_blank"
            rel="nofollow sponsored"
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <div>
                <p className="text-sm font-semibold">Get eSIM (CellESIM)</p>
                <p className="text-[11px] text-muted-foreground">Stay connected abroad — affiliate link</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary">→</span>
          </a>

          {completedCount === TOTAL_ITEMS && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 p-4 text-center"
            >
              <p className="text-sm font-semibold mb-1">Ready to explore {trip.selected_destination || "your destination"}?</p>
              <p className="text-xs text-muted-foreground mb-3">Check out real places, food and stays nearby.</p>
              <Link
                to="/nearby"
                onClick={() => trackEvent("checklist_explore_nearby", { destination: trip.selected_destination })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-black/80 transition-colors"
              >
                <MapPin className="w-4 h-4" /> Explore Nearby →
              </Link>
            </motion.div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            All items are optional — check what you need. Progress saves automatically.
          </p>
        </div>
      </div>
      <BottomNav active="/plan" />
    </div>
  );
}