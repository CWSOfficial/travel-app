import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sunrise, Sun, Moon, BedDouble, Lightbulb, RefreshCw, Shuffle,
  Loader2, Calendar, Sparkles,
} from "lucide-react";

const SLOT_META = {
  morning: { icon: Sunrise, label: "Morning", color: "text-amber-400" },
  afternoon: { icon: Sun, label: "Afternoon", color: "text-orange-400" },
  evening: { icon: Moon, label: "Evening", color: "text-indigo-400" },
};

function ActivityCard({ activity, dayIdx, slot, onSwap, swapping }) {
  const Icon = SLOT_META[slot].icon;
  return (
    <div className="relative rounded-xl border border-border bg-card/60 p-3 group">
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${SLOT_META[slot].color}`} />
        <div className="flex-1 min-w-0 pr-12">
          <p className="text-sm font-semibold leading-tight">{activity.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activity.description}</p>
          {activity.cost && (
            <span className="inline-block mt-1.5 text-[11px] font-medium text-primary">{activity.cost}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onSwap(dayIdx, slot, activity)}
        disabled={swapping}
        className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
        title="Swap this spot"
      >
        {swapping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

function DaySkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
      <div className="h-5 w-40 bg-muted rounded mb-4" />
      <div className="grid md:grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 bg-muted/60 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function InteractiveItinerary({
  itinerary,
  isLoading,
  onRegenerateDay,
  onSwapSpot,
  regeneratingDay,
  swappingSpot,
}) {
  if (isLoading && (!itinerary || itinerary.length === 0)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          Crafting your day-by-day plan…
        </div>
        {[0, 1, 2].map((i) => <DaySkeleton key={i} />)}
      </div>
    );
  }

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No itinerary yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {itinerary.map((day, idx) => {
          const isRegenerating = regeneratingDay === idx;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{day.theme || `Day ${idx + 1}`}</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Day {idx + 1}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRegenerateDay(idx)}
                  disabled={isRegenerating}
                  className="h-11 rounded-lg gap-1.5 text-xs"
                >
                  {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Regenerate Day
                </Button>
              </div>

              {/* Activities */}
              <div className="grid md:grid-cols-3 gap-2">
                {["morning", "afternoon", "evening"].map((slot) => {
                  const acts = day[slot] || [];
                  const first = acts[0];
                  if (!first) return <div key={slot} className="rounded-xl border border-dashed border-border/50 p-3 text-xs text-muted-foreground">No {slot} activity</div>;
                  return (
                    <ActivityCard
                      key={slot}
                      activity={first}
                      dayIdx={idx}
                      slot={slot}
                      onSwap={onSwapSpot}
                      swapping={swappingSpot && swappingSpot.dayIdx === idx && swappingSpot.slot === slot}
                    />
                  );
                })}
              </div>

              {/* Accommodation + tip */}
              {(day.accommodation || day.tips) && (
                <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {day.accommodation && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <BedDouble className="w-3.5 h-3.5 text-sky-400" /> {day.accommodation}
                    </span>
                  )}
                  {day.tips && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> {day.tips}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}