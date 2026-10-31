import { useState } from "react";
import { motion } from "framer-motion";
import CommandBanner from "./CommandBanner";
import InteractiveItinerary from "./InteractiveItinerary";
import SmartBookingHub from "./SmartBookingHub";
import TripReadinessBar from "./TripReadinessBar";
import ExportShareBar from "./ExportShareBar";
import { Calendar, ShoppingBag } from "lucide-react";

const TABS = [
  { id: "itinerary", label: "Itinerary", icon: Calendar },
  { id: "booking", label: "Booking Hub", icon: ShoppingBag },
];

export default function CommandCenter({
  destination,
  preferences,
  itinerary,
  isGeneratingItinerary,
  regeneratingDay,
  swappingSpot,
  readiness,
  tripId,
  isSaving,
  onRegenerateDay,
  onSwapSpot,
  onToggleReadiness,
  onReadinessAction,
  onAffiliateClick,
  onSaveTrip,
  pendingAction,
  onPendingDone,
}) {
  const [tab, setTab] = useState("itinerary");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl lg:max-w-7xl mx-auto px-4 py-6 space-y-4 lg:px-8 lg:py-9 lg:space-y-6"
    >
      {/* a. Top Banner */}
      <CommandBanner destination={destination} preferences={preferences} isLoading={isGeneratingItinerary} />

      {/* d. Dynamic Checklist Bar (always visible) */}
      <TripReadinessBar readiness={readiness} onToggle={onToggleReadiness} onAction={onReadinessAction} />

      {/* Tabs */}
      <div className="flex items-center gap-2 lg:w-fit lg:rounded-2xl lg:border lg:border-white lg:bg-white/80 lg:p-1.5 lg:shadow-[0_7px_22px_rgba(16,33,73,0.055)]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                tab === t.id ? "bg-primary text-primary-foreground lg:shadow-[0_5px_14px_rgba(8,120,209,0.22)]" : "bg-card border border-border text-muted-foreground hover:text-foreground lg:border-transparent lg:bg-transparent"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* b. Interactive Itinerary OR c. Smart Booking Hub */}
      {tab === "itinerary" ? (
        <InteractiveItinerary
          itinerary={itinerary}
          isLoading={isGeneratingItinerary}
          onRegenerateDay={onRegenerateDay}
          onSwapSpot={onSwapSpot}
          regeneratingDay={regeneratingDay}
          swappingSpot={swappingSpot}
        />
      ) : (
        <SmartBookingHub destination={destination} preferences={preferences} onAffiliateClick={onAffiliateClick} />
      )}

      {/* Export / Share / Save */}
      <div className="pt-2">
        <ExportShareBar
          destination={destination}
          preferences={preferences}
          itinerary={itinerary}
          tripId={tripId}
          onSave={onSaveTrip}
          isSaving={isSaving}
          pendingAction={pendingAction}
          onPendingDone={onPendingDone}
        />
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground text-center pt-2 leading-relaxed">
        AI-generated guidance. Always verify visa requirements with the official embassy and check government foreign-travel-advice before travelling.
      </p>
    </motion.div>
  );
}
