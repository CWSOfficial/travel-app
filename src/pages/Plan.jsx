import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Compass, Map, Route } from "lucide-react";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import ChatBubble from "@/components/ai/ChatBubble";
import QuickReplies from "@/components/ai/QuickReplies";
import ProgressDots from "@/components/ai/ProgressDots";
import { trackEvent } from "@/lib/analytics";
import posthog from 'posthog-js';

// Chat-style branching entry point. Reuses existing conversational components.
// "Curated Trip" → DMC-partner browse screen; "Plan It Yourself" → existing planner.
export default function Plan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    posthog.capture('pillar_engaged', {
      pillar: 'Plan',
      action: 'viewed',
      page: window.location.pathname,
    });
  }, []);

  const handleSelect = ({ value }) => {
    trackEvent("plan_branch_selected", { branch: value });
    if (value === "curated") {
      navigate("/curated-trips");
    } else if (value === "multi_city") {
      navigate("/multi-city");
    } else {
      // Route into the new Trip Dashboard experience.
      navigate("/trip-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Navbar />
      <div className="max-w-2xl lg:max-w-7xl mx-auto px-4 py-10 lg:px-8 lg:py-12">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ProgressDots total={1} current={0} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="text-center mb-6 lg:mb-9 lg:flex lg:items-center lg:gap-6 lg:rounded-[32px] lg:border lg:border-[#dfe8f3] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_65%,#e9f7fa_100%)] lg:px-9 lg:py-8 lg:text-left lg:shadow-[0_18px_48px_rgba(16,33,73,0.07)]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center mx-auto mb-3 shadow-sm lg:mx-0 lg:mb-0 lg:h-[72px] lg:w-[72px] lg:rounded-[22px] lg:shadow-[0_12px_26px_rgba(8,120,209,0.22)]">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0878d1]">Your journey, your way</p>
              <h1 className="font-display text-2xl font-bold lg:text-[38px] lg:leading-tight lg:tracking-[-0.04em]">Plan a Trip</h1>
              <p className="text-sm text-muted-foreground mt-1 lg:mt-2 lg:text-base">Three ways to get away — pick the journey that fits you.</p>
            </div>
          </div>

          {/* Chat branching */}
          <div className="space-y-3">
            <div className="hidden lg:block mb-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#617084]">Choose your planning style</p>
              <h2 className="mt-1 text-xl font-bold text-[#071a40]">How would you like to plan?</h2>
            </div>
            <div className="lg:hidden"><ChatBubble from="assistant">
              How would you like to plan your trip? 👇
            </ChatBubble></div>

            <div className="space-y-3 mt-4 lg:mt-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0">
              <button
                type="button"
                onClick={() => handleSelect({ value: "curated" })}
                className="w-full text-left p-4 rounded-2xl border border-border bg-white hover:border-primary/60 hover:shadow-sm transition-all group lg:min-h-[250px] lg:rounded-[28px] lg:border-[#e0e8f2] lg:p-6 lg:shadow-[0_10px_28px_rgba(16,33,73,0.055)] lg:hover:-translate-y-1 lg:hover:shadow-[0_20px_38px_rgba(16,33,73,0.11)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 lg:h-14 lg:w-14 lg:rounded-2xl lg:bg-[linear-gradient(145deg,#fff4d6,#ffe4a3)]">
                    <Compass className="w-5 h-5 text-amber-600 lg:h-6 lg:w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm lg:mt-5 lg:text-lg lg:font-bold">Curated Trip</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed lg:mt-2 lg:text-sm lg:leading-6">
                      Curated packages — flights, hotels & experiences bundled for you.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelect({ value: "self" })}
                className="w-full text-left p-4 rounded-2xl border border-border bg-white hover:border-primary/60 hover:shadow-sm transition-all group lg:min-h-[250px] lg:rounded-[28px] lg:border-[#e0e8f2] lg:p-6 lg:shadow-[0_10px_28px_rgba(16,33,73,0.055)] lg:hover:-translate-y-1 lg:hover:shadow-[0_20px_38px_rgba(16,33,73,0.11)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 lg:h-14 lg:w-14 lg:rounded-2xl lg:bg-[linear-gradient(145deg,#e4f6ff,#c7eaff)]">
                    <Map className="w-5 h-5 text-sky-600 lg:h-6 lg:w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm lg:mt-5 lg:text-lg lg:font-bold">Plan It Yourself</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed lg:mt-2 lg:text-sm lg:leading-6">
                      Use our AI planner to build your own itinerary from scratch — full control, your pace.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelect({ value: "multi_city" })}
                className="w-full text-left p-4 rounded-2xl border border-border bg-white hover:border-primary/60 hover:shadow-sm transition-all group lg:min-h-[250px] lg:rounded-[28px] lg:border-[#e0e8f2] lg:p-6 lg:shadow-[0_10px_28px_rgba(16,33,73,0.055)] lg:hover:-translate-y-1 lg:hover:shadow-[0_20px_38px_rgba(16,33,73,0.11)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 lg:h-14 lg:w-14 lg:rounded-2xl lg:bg-[linear-gradient(145deg,#defaf4,#b9eee5)]">
                    <Route className="w-5 h-5 text-teal-600 lg:h-6 lg:w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm lg:mt-5 lg:text-lg lg:font-bold">Multi-City Journey</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed lg:mt-2 lg:text-sm lg:leading-6">
                      One connected trip across multiple cities or countries — Bangalore → Paris → Venice → London and back.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 lg:hidden">
              <QuickReplies
                options={[
                  { label: "Browse Curated Trips", value: "curated" },
                  { label: "Plan It Yourself", value: "self" },
                  { label: "Multi-City Journey", value: "multi_city" },
                ]}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </motion.div>
      </div>
      <BottomNav active="/plan" />
    </div>
  );
}
