import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";

// Navigation layer only — every card routes to an EXISTING page/workflow/affiliate link.
// No new pages, no logic changes. "plan" starts the existing trip-planner workflow;
// "link" routes to an existing in-app page; "ext" opens an existing affiliate link.
const ACTIONS = [
  { emoji: "🧳", label: "Plan a Trip", subtitle: "AI itinerary planner", kind: "plan-home", tileName: "plan_a_trip" },
  { emoji: "🛂", label: "Visa Check", subtitle: "Entry requirements", kind: "link", to: "/visa", tileName: "visa_check" },
  { emoji: "🔒", label: "Safety", subtitle: "Destination ratings", kind: "link", to: "/safety", tileName: "safety" },
  { emoji: "🌤", label: "Weather", subtitle: "Before you fly", kind: "link", to: "/weather", tileName: "weather" },
  { emoji: "✈", label: "Flights & Hotels", subtitle: "Compare & book", kind: "link", to: "/flights-hotels", tileName: "flights_hotels" },
  { emoji: "🛕", label: "Pilgrimage & Cultural Tours", subtitle: "Spiritual & heritage journeys", kind: "link", to: "/pilgrimage-tours", tileName: "pilgrimage_tours" },
  { emoji: "🎟", label: "Attractions & Car Rental", subtitle: "Tours, sights & vehicles", kind: "link", to: "/attractions", tileName: "attractions" },
  { emoji: "📱", label: "eSIM", subtitle: "Stay connected abroad", kind: "link", to: "/esim", tileName: "esim" },
  { emoji: "🛡", label: "Travel Insurance", subtitle: "Get covered", kind: "link", to: "/insurance", tileName: "travel_insurance" },
  { emoji: "🏛️", label: "DMC Portal", subtitle: "Submit trip packages", kind: "link", to: "/dmc", tileName: "dmc_portal" },
];

export default function QuickActions({ onPlanTrip, onQuickPlan }) {
  const [firstName, setFirstName] = useState(null);
  const [userId, setUserId] = useState(null);

  // Self-contained: reads the current user's name without touching Home's existing auth logic.
  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setFirstName(u?.full_name ? u.full_name.trim().split(/\s+/)[0] : null);
        setUserId(u?.id || null);
      })
      .catch(() => {});
  }, []);

  const handleClick = (a, position) => {
    trackEvent("quick_action_click", { label: a.label });
    // GA4 custom event
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "home_tile_click", {
        tile_name: a.tileName,
        tile_position: position,
        user_id: userId || "",
        timestamp: new Date().toISOString(),
      });
    }
    if (a.kind === "plan-home") onPlanTrip?.();
    else if (a.kind === "plan") onQuickPlan?.();
  };

  return (
    <section
      className="relative max-w-5xl mx-auto px-4 pt-6 pb-2 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0A1628 0%, #0D1F3C 40%, #0A2240 70%, #0D1628 100%)" }}
    >
      {/* Faint world map watermark */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.03 }}
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g fill="#FFFFFF">
          <path d="M150,80 C120,70 95,105 110,155 L130,210 L185,225 L225,185 L245,140 L230,95 L190,75 Z" />
          <path d="M250,250 C235,245 225,265 240,310 L260,370 L295,385 L315,340 L305,275 Z" />
          <path d="M470,90 L455,135 L495,145 L525,120 L515,90 Z" />
          <path d="M470,160 C455,175 470,230 495,270 L525,305 L548,280 L535,215 L510,175 Z" />
          <path d="M550,80 L535,145 L600,185 L685,165 L745,125 L720,75 L615,65 Z" />
          <path d="M780,300 L755,345 L815,365 L845,330 L820,295 Z" />
        </g>
      </svg>
      <h2 className="relative font-display text-2xl font-bold text-white">
        {firstName ? `Hi ${firstName} 👋` : "Hi 👋"}
      </h2>
      <p className="relative text-sm mt-1 mb-4" style={{ color: "#00E5CC" }}>What would you like to do today?</p>
      <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
        {ACTIONS.map((a, i) => {
          const inner = (
            <>
              <span className="text-2xl sm:text-3xl">{a.emoji}</span>
              <span className="text-xs sm:text-sm font-medium text-center leading-tight">{a.label}</span>
              <span className="text-[10px] sm:text-[11px] text-white/55 text-center leading-tight">{a.subtitle}</span>
            </>
          );
          const cls =
            "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:p-4 backdrop-blur-[10px] hover:border-primary/60 hover:bg-white/[0.10] transition-colors";
          if (a.kind === "ext") {
            return (
              <a key={a.label} href={a.href} target="_blank" rel="nofollow sponsored" className={cls} onClick={() => handleClick(a, i + 1)}>
                {inner}
              </a>
            );
          }
          if (a.kind === "link") {
            return (
              <Link key={a.label} to={a.to} className={cls} onClick={() => handleClick(a, i + 1)}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={a.label} type="button" className={cls} onClick={() => handleClick(a, i + 1)}>
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}