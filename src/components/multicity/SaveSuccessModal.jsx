import { motion } from "framer-motion";
import { Sparkles, Rocket, Compass, X } from "lucide-react";

// Non-intrusive success modal shown after a successful journey save.
// Primary CTA "Start Booking" opens the segment-aware booking actions.
// Secondary "View Saved Journey" updates the URL to the saved trip and keeps
// the user on the journey page. Tertiary "Keep Exploring" dismisses.
// Never shown if save failed. Dismissible via X, backdrop, or "Keep Exploring".
export default function SaveSuccessModal({ open, onStartBooking, onViewJourney, onDismiss }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-3xl border border-teal-500/25 bg-card p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Journey saved</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your trip is now available in My Trips.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onStartBooking}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
          >
            <Rocket className="w-4 h-4" /> Start Booking
          </button>
          {onViewJourney && (
            <button
              onClick={onViewJourney}
              className="w-full h-11 rounded-2xl border border-teal-500/25 bg-teal-500/10 text-teal-300 font-medium text-sm inline-flex items-center justify-center gap-2 hover:bg-teal-500/15"
            >
              <Compass className="w-4 h-4" /> View Saved Journey
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-full h-11 rounded-2xl border border-white/10 bg-white/5 text-slate-300 font-medium text-sm inline-flex items-center justify-center gap-2 hover:bg-white/10"
          >
            Keep Exploring
          </button>
        </div>
      </motion.div>
    </div>
  );
}