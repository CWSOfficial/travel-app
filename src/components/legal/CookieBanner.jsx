import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { initMetaPixel } from "@/lib/metaPixel";

const COOKIE_KEY = "dheetrip_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) {
      // Delay slightly so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: true, ts: Date.now() }));
    setVisible(false);
    initMetaPixel(); // load the Meta Pixel now that analytics consent was granted
  };

  const savePreferences = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: analyticsConsent, ts: Date.now() }));
    setVisible(false);
    if (analyticsConsent) initMetaPixel(); // load only if the user opted in
  };

  const rejectOptional = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: false, ts: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] max-w-lg mx-auto">
      <div className="bg-white border border-border shadow-2xl rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">We use cookies</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Essential cookies keep the app working. With your consent, we also use analytics cookies to improve the experience.{" "}
              <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            </p>
          </div>
          <button onClick={() => setVisible(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted flex-shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {showDetails && (
          <div className="mb-3 space-y-2 border border-border rounded-xl p-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold">Essential cookies</p>
                <p className="text-muted-foreground">Required for authentication & security</p>
              </div>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Always on</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold">Analytics cookies</p>
                <p className="text-muted-foreground">Anonymous usage stats to improve the app</p>
              </div>
              <button
                onClick={() => setAnalyticsConsent(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${analyticsConsent ? "bg-black" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${analyticsConsent ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={acceptAll} className="flex-1 h-8 text-xs rounded-lg bg-black text-white hover:bg-black/80">
            Accept all
          </Button>
          <Button size="sm" variant="outline" onClick={rejectOptional} className="flex-1 h-8 text-xs rounded-lg">
            Essential only
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDetails(v => !v)} className="h-8 w-8 p-0 rounded-lg flex-shrink-0">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
        {showDetails && (
          <Button size="sm" onClick={savePreferences} className="w-full mt-2 h-8 text-xs rounded-lg" variant="outline">
            Save my preferences
          </Button>
        )}
      </div>
    </div>
  );
}