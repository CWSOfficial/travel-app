import { useEffect, useRef, useState } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// GetYourGuide dynamic affiliate widget — shows bookable activities
// (photo, title, price, rating) for the current destination.
//
// RESEARCH FINDING: The "auto" widget mode (data-gyg-widget="auto") analyzes
// page content text to determine destination — it does NOT accept an explicit
// destination parameter. That won't work in an SPA where the destination
// changes dynamically without page content changes.
//
// Instead we use the explicit "activities" mode with data-gyg-q="{destination}"
// — the GetYourGuide equivalent of Viator's data-vi-search-term. This lets us
// dynamically pass the current destination per the user's request.
//
// SPA-safe approach: same iframe + srcDoc pattern as ViatorWidget — each
// destination renders a fresh iframe with a complete HTML document containing
// the GetYourGuide widget div + script. The key={destination.name} on the
// iframe forces React to create a brand new iframe (fresh document) per
// destination, ensuring the third-party script re-initializes correctly.

const GYG_SCRIPT_SRC = "https://widget.getyourguide.com/dist/pa.umd.production.min.js";
const PARTNER_ID = "YIJSN5X";

function buildWidgetHtml(searchTerm) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
  body { margin: 0; padding: 4px; background: #ffffff; font-family: sans-serif; }
</style>
</head>
<body>
<div
  data-gyg-href="https://widget.getyourguide.com/default/activities.frame"
  data-gyg-locale-code="en-US"
  data-gyg-widget="activities"
  data-gyg-number-of-items="6"
  data-gyg-cmp="dheevoy"
  data-gyg-partner-id="${PARTNER_ID}"
  data-gyg-q="${searchTerm.replace(/"/g, '&quot;')}"
></div>
<script async src="${GYG_SCRIPT_SRC}"></script>
</body>
</html>`;
}

export default function GetYourGuideWidget({ destination }) {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(380);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!destination?.name) return;

    trackEvent("gyg_widget_view", { destination: destination.name });
    setHeight(380);
    setLoaded(false);

    // Poll iframe content height to auto-resize once GetYourGuide renders.
    // srcDoc iframes are same-origin, so contentDocument is accessible.
    const interval = setInterval(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const h = doc.body?.scrollHeight || doc.documentElement?.scrollHeight;
        if (h && h > 100) {
          setHeight(h);
          if (h > 200) setLoaded(true);
        }
      } catch {
        // cross-origin or not ready — keep polling
      }
    }, 800);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setLoaded(true);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [destination?.name]);

  if (!destination?.name) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">
          Bookable experiences via GetYourGuide
        </p>
      </div>
      {/* Framing wrapper: rounded border + card bg bridges GetYourGuide's
          white widget cards against the app's dark theme so they look intentional */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card p-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Loading experiences…</span>
          </div>
        )}
        <iframe
          key={destination.name}
          ref={iframeRef}
          srcDoc={buildWidgetHtml(destination.name)}
          title="GetYourGuide bookable experiences"
          sandbox="allow-scripts allow-same-origin"
          className="w-full border-0 bg-white"
          style={{ height: `${height}px` }}
          loading="lazy"
        />
      </div>
    </div>
  );
}