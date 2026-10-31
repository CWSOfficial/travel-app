import { motion } from "framer-motion";
import { X, Sparkles, Download, Share2, Save, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/AuthContext";
import GoogleIcon from "@/components/GoogleIcon";

// Elegant lead-capture modal shown when a GUEST clicks Export PDF, Share, or Save Trip.
// Sign-in stores the pending action in sessionStorage so it auto-completes after redirect.
export default function SaveTripPlanModal({ open, onClose, actionType, onContinueAsGuest }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  // Test override: ?test_guest=1 lets authenticated testers preview the guest modal
  const simulateGuest = new URLSearchParams(window.location.search).get("test_guest") === "1";
  if (!open || (isAuthenticated && !simulateGuest)) return null;

  const actionIcon = { export: Download, share: Share2, save: Save }[actionType] || Save;
  const ActionIcon = actionIcon;

  const returnTo = window.location.pathname + window.location.search;

  const handleGoogle = () => {
    trackEvent("guest_lead_capture_google", { action: actionType });
    sessionStorage.setItem("dheevoy_pending_action", actionType);
    base44.auth.loginWithProvider("google", returnTo);
  };

  const handleEmail = () => {
    trackEvent("guest_lead_capture_email", { action: actionType });
    sessionStorage.setItem("dheevoy_pending_action", actionType);
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleGuest = () => {
    trackEvent("guest_lead_capture_continue_guest", { action: actionType });
    onContinueAsGuest();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0D1F3C] p-6 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-5">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
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
          Save &amp; Sync Your Itinerary
        </h2>
        <p className="text-sm text-white/60 mt-2 leading-relaxed">
          Get instant access to your offline PDF, live visa alerts, and synced checklists.
        </p>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          className="w-full rounded-2xl bg-white text-slate-900 font-semibold py-3.5 mt-6 hover:bg-white/90 transition-colors flex items-center justify-center gap-2.5"
        >
          <GoogleIcon className="w-5 h-5" />
          Continue with Google
        </button>

        {/* Email Sign-In */}
        <button
          onClick={handleEmail}
          className="w-full rounded-2xl border border-white/20 text-white font-semibold py-3.5 mt-2.5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Sign in with Email
        </button>

        {/* Continue as Guest */}
        <button
          onClick={handleGuest}
          className="w-full text-center text-sm text-white/50 font-medium py-2.5 mt-2 hover:text-white/70 transition-colors"
        >
          Continue as Guest (Download Once)
        </button>

        <p className="text-[11px] text-white/40 text-center mt-3 leading-relaxed">
          We use your email only to sync your trips. No spam, unsubscribe anytime.
        </p>
      </motion.div>
    </motion.div>
  );
}