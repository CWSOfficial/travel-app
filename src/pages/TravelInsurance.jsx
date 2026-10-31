import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import ChatBubble from "@/components/ai/ChatBubble";
import QuickReplies from "@/components/ai/QuickReplies";
import ProgressDots from "@/components/ai/ProgressDots";
import PostFlowContinuation from "@/components/ai/PostFlowContinuation";
import ContactCaptureStep from "@/components/ai/ContactCaptureStep";
import SavedReportHint from "@/components/ai/SavedReportHint";
import FlowLoadingBubble from "@/components/ai/FlowLoadingBubble";
import BackToChecklist from "@/components/ai/BackToChecklist";
import { trackEvent } from "@/lib/analytics";
import { getPartnerId } from "@/lib/partnerAttribution";
import { setCapturedContact } from "@/lib/capturedContact";
import { cleanCountryName } from "@/lib/flagEmoji";
import { validateInsuranceResult, INSURANCE_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { destinationSlug } from "@/lib/affiliateDeepLink";
import { Send, Loader2, Sparkles, Minus, Plus } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

const INSURANCE_AFFILIATE_URL = "https://safetywing.com/nomad-insurance?referenceID=26569327&utm_source=26569327&utm_medium=Ambassador";

const COST_RANGES = [
  { label: "Under $500", value: "under_500" },
  { label: "$500–1500", value: "500_1500" },
  { label: "$1500–5000", value: "1500_5000" },
  { label: "$5000+", value: "5000_plus" },
];

const TRAVELER_CHIPS = ["1", "2", "3", "4+"];

const ACTIVITIES = [
  "Diving", "Skiing/snowboarding", "Trekking/mountaineering", "Surfing",
  "Rock climbing", "Mountain biking", "Other",
];

const PLAN_TIERS = [
  { id: "Basic", title: "Basic", subtitle: "Essentials", desc: "Trip cancellation, emergency medical up to base limit" },
  { id: "Standard", title: "Standard", subtitle: "Popular", desc: "Higher medical limits, baggage & delay cover" },
  { id: "Premium", title: "Premium", subtitle: "Comprehensive", desc: "Max medical, evacuation, adventure-sports add-on" },
];

const STAGE_INDEX = { dest: 0, cost: 1, travelers: 2, activities: 3, loading: 4, result: 4 };

export default function TravelInsurance() {
  const [stage, setStage] = useState("dest");
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hi! I'm Dbuddy. Let's get you the right travel cover 🛡\nWhere are you headed?" },
  ]);
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [tripCost, setTripCost] = useState(null);
  const [travelerCount, setTravelerCount] = useState(null);
  const [showStepper, setShowStepper] = useState(false);
  const [stepperVal, setStepperVal] = useState(4);
  const [adventureYes, setAdventureYes] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [logId, setLogId] = useState(null);
  const [contact, setContact] = useState(null);
  const [contactCaptured, setContactCaptured] = useState(false);
  const contactLogged = useRef(false);

  useEffect(() => {
    if (contact && logId && !contactLogged.current) {
      contactLogged.current = true;
      setCapturedContact(contact.name, contact.email);
      base44.entities.AiSessionLog.update(logId, {
        contact_name: contact.name,
        contact_email: contact.email,
        cta_clicked: true,
      }).catch(() => {});
      trackEvent("insurance_contact_captured", { destination });
    }
  }, [contact, logId]);
  const [trending, setTrending] = useState([]);
  const [askOpen, setAskOpen] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askThread, setAskThread] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    base44.entities.DestinationSafetyCache.list("-last_updated", 12)
      .then((items) => {
        const names = items
          .map((i) => cleanCountryName(i.country_name))
          .filter((n) => n && n.length >= 4 && !/^[A-Z]{2}$/.test(n));
        setTrending([...new Set(names)]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, aiData, showStepper, adventureYes, askOpen, askThread, askLoading, contact, contactCaptured]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const submitDestination = (val) => {
    const dest = (typeof val === "string" ? val : val?.label) || destInput;
    if (!dest?.trim()) return;
    setDestination(dest.trim());
    setDestInput("");
    pushMsg("user", dest.trim());
    setStage("cost");
    setTimeout(() => pushMsg("assistant", "Got it. What's your total trip cost?"), 250);
  };

  const submitCost = (opt) => {
    setTripCost(opt.label);
    pushMsg("user", opt.label);
    setStage("travelers");
    setTimeout(() => pushMsg("assistant", "How many travelers?"), 250);
  };

  const submitTravelersChip = (chip) => {
    if (chip === "4+") {
      setShowStepper(true);
      return;
    }
    const n = parseInt(chip, 10);
    setTravelerCount(n);
    pushMsg("user", chip);
    setStage("activities");
    setTimeout(() => pushMsg("assistant", "Planning any adventure sports or high-risk activities?"), 250);
  };

  const confirmStepper = () => {
    setTravelerCount(stepperVal);
    pushMsg("user", `${stepperVal} travelers`);
    setShowStepper(false);
    setStage("activities");
    setTimeout(() => pushMsg("assistant", "Planning any adventure sports or high-risk activities?"), 250);
  };

  const submitAdventure = (yes) => {
    setAdventureYes(yes);
    pushMsg("user", yes ? "Yes" : "No");
    if (!yes) {
      runRecommendation([]);
      return;
    }
  };

  const toggleActivity = (a) => {
    setSelectedActivities((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  };

  const confirmActivities = () => {
    pushMsg("user", selectedActivities.length ? selectedActivities.join(", ") : "None selected");
    runRecommendation(selectedActivities);
  };

  const runRecommendation = async (activities) => {
    setStage("loading");
    setLoading(true);
    pushMsg("assistant", "Assessing your cover needs…");
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "insurance_recommendation",
        input: { destination, tripCost, travelerCount, activities: activities.length ? activities.join(", ") : "none" },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateInsuranceResult(result);
      setAiData(valid);
      setSelectedTier(valid.recommended_tier);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: `${valid.recommendation_blurb}${valid.risk_note ? `\n${valid.risk_note}` : ""}` };
        return copy;
      });
      setStage("result");
      trackEvent("insurance_recommendation_shown", { destination, tier: valid.recommended_tier, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "insurance",
          guest_claim_hash: await getGuestClaimHash(),
          destination,
          partner_id: getPartnerId(),
          trip_cost: tripCost,
          traveler_count: travelerCount,
          adventure_activities: activities,
          recommendation_shown: valid.recommendation_blurb,
          cta_clicked: false,
          guardrail_triggered: guardrail.triggered,
          guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Insurance AI error:", err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate a recommendation just now. Please try again." };
        return copy;
      });
      setStage("activities");
    } finally {
      setLoading(false);
    }
  };

  const handleCta = () => {
    const tier = selectedTier || aiData?.recommended_tier || "";
    const params = new URLSearchParams({ destination: destinationSlug(destination), travelers: String(travelerCount || 1), tier });
    const url = `${INSURANCE_AFFILIATE_URL}&${params.toString()}`;
    if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true }).catch(() => {});
    trackEvent("insurance_cta_click", { destination, tier });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAsk = async () => {
    const q = askInput.trim();
    if (!q) return;
    setAskThread((t) => [...t, { from: "user", text: q }]);
    setAskInput("");
    setAskLoading(true);
    try {
      const result = await base44.functions
        .invoke("generateAiContent", {
          purpose: "flow_followup",
          input: { flowContext: `travel insurance flow (going to ${destination})`, q },
        })
        .then((r) => r.data);
      setAskThread((t) => [...t, { from: "assistant", text: result }]);
    } catch (e) {
      console.error("Insurance follow-up AI error:", e);
      setAskThread((t) => [...t, { from: "assistant", text: "Sorry, I couldn't answer that right now." }]);
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <BackToChecklist />
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Travel Insurance</h1>
            <p className="text-xs text-white/50">Chat with Dbuddy AI</p>
          </div>
          <ProgressDots total={5} current={STAGE_INDEX[stage] ?? 0} />
        </header>

        <div ref={scrollRef} className="space-y-3 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {messages.map((m, i) => (
            <ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>
          ))}

          {loading && <FlowLoadingBubble />}

          {stage === "dest" && (
            <div className="space-y-3 pt-2">
              {trending.length > 0 && (
                <QuickReplies
                  options={trending.slice(0, 6).map((t) => ({ label: t, value: t }))}
                  onSelect={(o) => submitDestination(o.label)}
                />
              )}
              <form onSubmit={(e) => { e.preventDefault(); submitDestination(destInput); }} className="flex gap-2">
                <input
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  placeholder="Type a destination…"
                  className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
                />
                <button type="submit" className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {stage === "cost" && (
            <div className="pt-2">
              <QuickReplies options={COST_RANGES} onSelect={submitCost} />
            </div>
          )}

          {stage === "travelers" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={TRAVELER_CHIPS} onSelect={(o) => submitTravelersChip(o.label)} />
              {showStepper && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStepperVal((v) => Math.max(4, v - 1))} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center hover:border-primary/60">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-semibold text-white">{stepperVal}</span>
                  <button type="button" onClick={() => setStepperVal((v) => v + 1)} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center hover:border-primary/60">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={confirmStepper} className="ml-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {stage === "activities" && (
            <div className="space-y-3 pt-2">
              {adventureYes === null ? (
                <QuickReplies options={["Yes", "No"]} onSelect={(o) => submitAdventure(o.label === "Yes")} />
              ) : adventureYes ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITIES.map((a) => {
                      const on = selectedActivities.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleActivity(a)}
                          className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                            on ? "border-primary bg-primary/15 text-primary" : "border-white/15 bg-white/[0.05] hover:border-primary/60"
                          }`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={confirmActivities}
                    className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90"
                  >
                    Continue
                  </button>
                </>
              ) : null}
            </div>
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated suggestion based on what you told us — always verify exact pricing and coverage details with the provider before purchasing.</p>
              <div className="grid gap-3">
                {PLAN_TIERS.map((plan) => {
                  const isRec = plan.id === aiData.recommended_tier;
                  const isSel = plan.id === selectedTier;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedTier(plan.id)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        isSel ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.05] hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{plan.title}</span>
                        <span className="text-[11px] text-white/50">{plan.subtitle}</span>
                        {isRec && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Recommended for you
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-1">{plan.desc}</p>
                    </button>
                  );
                })}
              </div>

              <ContactCaptureStep
                flowType="insurance"
                onCaptured={(name, email) => { setContact({ name, email }); setContactCaptured(true); }}
              />

              {contactCaptured && (
                <>
                  <SavedReportHint />
                  <button
                    type="button"
                    onClick={handleCta}
                    className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 hover:bg-primary/90 transition-colors"
                  >
                    Get Travel Insurance →
                  </button>
                  <p className="text-[10px] text-white/40 text-center -mt-2">Affiliate link · you may be redirected to our insurance partner</p>
                </>
              )}

              <PostFlowContinuation onAskQuestion={() => setAskOpen(true)} />

              {askOpen && (
                <div className="space-y-2 pt-2">
                  {askThread.map((m, i) => (
                    <ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>
                  ))}
                  {askLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="flex gap-2">
                    <input
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      placeholder="Ask me anything about your trip…"
                      className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
                    />
                    <button type="submit" disabled={askLoading} className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90 disabled:opacity-50">
                      {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav active="/" />
    </div>
  );
}