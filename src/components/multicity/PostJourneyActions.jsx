import { useNavigate } from "react-router-dom";
import { Compass, Plane, Bed, Map, Ticket, Sparkles, ChevronRight } from "lucide-react";
import posthog from "posthog-js";

// Post-save next-action area. Reuses EXISTING DheeVoy routes only — no new
// booking integrations are created here. Fires analytics on mount and clicks.
const ACTIONS = [
  { id: "continue", label: "Continue Planning", desc: "Refine or start a new journey", icon: Compass, path: "/plan" },
  { id: "hotels", label: "Explore Hotels", desc: "Find stays for your stops", icon: Bed, path: "/flights-hotels" },
  { id: "flights", label: "Explore Flights / Transport", desc: "Book transfer legs", icon: Plane, path: "/flights-hotels" },
  { id: "things", label: "Explore Things To Do", desc: "Activities at each destination", icon: Ticket, path: "/attractions" },
  { id: "curated", label: "View Relevant Curated Trips", desc: "Expert-built packages", icon: Map, path: "/curated-trips" },
];

export default function PostJourneyActions({ journey }) {
  const navigate = useNavigate();

  // Fire once when the action area becomes visible.
  // (journey_booking_options_viewed — no PII)
  // Done in the parent via useEffect to avoid duplicate fires on re-render;
  // this component just emits the per-click events.

  const handleClick = (action) => {
    posthog.capture("journey_booking_options_viewed", { action_id: action.id });
    if (action.id === "curated") {
      posthog.capture("journey_curated_trip_viewed", { source: "post_journey_actions" });
    }
    // Pass journey context where existing pages can consume it via query params.
    const dest = journey?.segments?.map((s) => s.destination_city).filter(Boolean).join(", ");
    const params = new URLSearchParams();
    if (dest) params.set("destinations", dest);
    if (journey?.startCity) params.set("from", journey.startCity);
    const qs = params.toString();
    navigate(qs ? `${action.path}?${qs}` : action.path);
  };

  return (
    <div className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-teal-400" /> Your journey is ready. What next?
      </p>
      <div className="space-y-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => handleClick(a)}
              className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:border-teal-500/40 hover:bg-white/10 transition-colors p-3 text-left min-h-[52px]"
            >
              <span className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-teal-300" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{a.label}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{a.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        Booking and partner links open existing DheeVoy flows. No new bookings are created in this step.
      </p>
    </div>
  );
}