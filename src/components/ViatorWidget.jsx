import { useEffect, useRef, useState } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// Viator dynamic affiliate widget — shows bookable ticketed experiences
// (photo, title, price, rating) for the current destination.
//
// SPA-safe approach: each destination renders a fresh iframe with a complete
// HTML document containing the Viator widget div + script. This gives the
// third-party script its own document context on every destination change,
// avoiding the common SPA issue where embed scripts won't re-initialize
// after the initial load. The key={destination.name} on the iframe forces
// React to create a brand new iframe (fresh document) per destination.

const VIATOR_SCRIPT_SRC = "https://www.viator.com/orion/partner/widget.js";
const PARTNER_ID = "P00310889";
const WIDGET_REF = "W-a3006802-9b59-4bc2-a213-5c0891299fed";

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
  data-vi-partner-id="${PARTNER_ID}"
  data-vi-widget-ref="${WIDGET_REF}"
  data-vi-search-term="${searchTerm.replace(/"/g, '&quot;')}"
  data-vi-language="en"
  data-vi-currency="USD"
></div>
<script async src="${VIATOR_SCRIPT_SRC}"></script>
</body>
</html>`;
}

export default function ViatorWidget({ destination }) {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(380);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!destination?.name) return;

    trackEvent("viator_widget_view", { destination: destination.name });
    setHeight(380);
    setLoaded(false);

    // Poll iframe content height to auto-resize once Viator renders.
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
          Bookable experiences via Viator
        </p>
      </div>
      {/* Framing wrapper: rounded border + card bg bridges Viator's white
          widget cards against the app's dark theme so they look intentional */}
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
          title="Viator bookable experiences"
          sandbox="allow-scripts allow-same-origin"
          className="w-full border-0 bg-white"
          style={{ height: `${height}px` }}
          loading="lazy"
        />
      </div>
    </div>
  );
}