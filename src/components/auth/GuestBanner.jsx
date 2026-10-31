import { useState } from "react";
import { Zap, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useProfilePrompt } from "@/lib/profilePromptContext";

// Slim, dismissible inline banner shown at the top of utility pages
// (Visa Check, Safety, Nearby) for unauthenticated guests only.
// "Set Up Profile" opens the Profile Prompt Sheet; dismiss persists
// for the browser session so it never nags.
const DISMISS_KEY = "dheevoy_guest_banner_dismissed";

export default function GuestBanner() {
  const { isAuthenticated } = useAuth();
  const { openPrompt } = useProfilePrompt();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  if (isAuthenticated || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 mb-4">
      <Zap className="w-4 h-4 text-primary shrink-0" />
      <p className="flex-1 text-xs sm:text-[13px] text-foreground/80 font-medium leading-snug">
        Unlock personalized visa alerts &amp; safety scores for your specific passport.
      </p>
      <button
        onClick={openPrompt}
        className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:bg-primary/90 transition-colors whitespace-nowrap"
      >
        Set Up Profile
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}
