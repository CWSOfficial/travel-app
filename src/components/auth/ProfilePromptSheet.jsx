import { motion } from "framer-motion";
import { X, UserPlus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

// Sleek, non-blocking bottom sheet shown to guests who hit a value-gated
// action (Profile/Refer nav tap, banner CTA). Never blocks page access —
// "Continue Browsing as Guest" closes it instantly.
export default function ProfilePromptSheet({ open, onClose }) {
  const navigate = useNavigate();
  if (!open) return null;

  const handleSignIn = () => {
    trackEvent("profile_prompt_sign_in_click");
    onClose();
    const returnTo = window.location.pathname + window.location.search;
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleGuest = () => {
    trackEvent("profile_prompt_continue_guest");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0D1F3C] p-6 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <h2 className="font-display text-xl font-bold text-white leading-tight">
          Personalize Your Travel Experience
        </h2>
        <p className="text-sm text-white/60 mt-2 leading-relaxed">
          Create a quick profile to save passport preferences, store favorite places, and track visa requirements in real time.
        </p>

        <button
          onClick={handleSignIn}
          className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 mt-5 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create Free Profile / Sign In
        </button>
        <button
          onClick={handleGuest}
          className="w-full text-center text-sm text-white/50 font-medium py-2.5 mt-1.5 hover:text-white/70 transition-colors"
        >
          Continue Browsing as Guest
        </button>
      </motion.div>
    </motion.div>
  );
}