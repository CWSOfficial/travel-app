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
import DateRangeStep from "@/components/ai/DateRangeStep";
import { trackEvent } from "@/lib/analytics";
import { getPartnerId } from "@/lib/partnerAttribution";
import { setCapturedContact } from "@/lib/capturedContact";
import { cleanCountryName } from "@/lib/flagEmoji";
import { validateEsimResult } from "@/lib/aiGuardrails";
import { destinationSlug } from "@/lib/affiliateDeepLink";
import { Send, Loader2, Sparkles } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

const ESIM_AFFILIATE_URL = "https://cellesim.com/r/dheevoy-limited-rze";

const PLAN_TIERS = [
  { id: "5GB", title: "5 GB", subtitle: "Light use", desc: "Maps, messaging, email" },
  { id: "10GB", title: "10 GB", subtitle: "Balanced", desc: "Maps, social, photos, some streaming" },
  { id: "Unlimited", title: "Unlimited", subtitle: "Power user", desc: "Video calls, streaming, no worries" },
];

// Deterministic data-usage estimate + plan recommendation (instant, no LLM).
// The LLM is now used only for a short friendly blurb, keeping the flow fast.
const DATA_ESTIMATES = { 3: 3, 7: 6, 14: 10, 21: 15 };
const estimateDataPlan = (days) => {
  const estimate = DATA_ESTIMATES[days] ?? Math.min(20, Math.max(3, Math.round(days * 0.7)));
  const plan = estimate <= 4 ? "5GB" : estimate <= 9 ? "10GB" : "Unlimited";
  return { estimate, plan };
};
const planLabel = (plan) => (plan === "Unlimited" ? "Unlimited" : plan.replace("GB", " GB"));
// LLM blurb only (string response — no JSON schema). Falls back to a templated
// blurb only on actual API error, never on timeout.
const fetchEsimBlurb = async (destination, tripLabel, plan, estimate) => {
  const fallback = `Based on your trip length, we'd suggest the ${planLabel(plan)} plan for ${destination}.`;
  try {
    const result = await base44.functions
      .invoke("generateAiContent", {
        purpose: "esim_plan_blurb",
        input: { destination, tripLabel, plan, estimate },
      })
      .then((r) => r.data);
    const text = typeof result === "string" ? result.trim().slice(0, 220) : "";
    return text || fallback;
  } catch {
    return fallback;
  }
};

const STAGE_INDEX = { dest: 0, length: 1, loading: 2, result: 2 };

export default function ESim() {
  const [stage, setStage] = useState("dest");
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hey! I'm Dbuddy. Let's find your perfect eSIM 📱\nWhere are you traveling?" },
  ]);
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [tripLength, setTripLength] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
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
      trackEvent("esim_contact_captured", { destination });
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
  }, [messages, loading, aiData, askOpen, askThread, askLoading, contact, contactCaptured]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const submitDestination = (val) => {
    const dest = (typeof val === "string" ? val : val?.label) || destInput;
    if (!dest?.trim()) return;
    setDestination(dest.trim());
    setDestInput("");
    pushMsg("user", dest.trim());
    setStage("length");
    setTimeout(() => pushMsg("assistant", "Great choice! When are you traveling?"), 250);
  };

  const submitLength = async (days, label, startDate, endDate) => {
    setTripLength({ label, days });
    pushMsg("user", label);
    setStage("loading");
    setLoading(true);
    try {
      const { estimate, plan } = estimateDataPlan(days);
      const blurb = await fetchEsimBlurb(destination, label, plan, estimate);
      const { data: valid, guardrail } = validateEsimResult({
        data_estimate_gb: estimate,
        recommended_plan: plan,
        recommendation_blurb: blurb,
      });
      setAiData(valid);
      const intro = valid.data_estimate_gb != null
        ? `For a ${label} trip to ${destination}, most travelers use around ~${valid.data_estimate_gb} GB.`
        : `For a ${label} trip to ${destination}:`;
      pushMsg("assistant", `${intro}\n${valid.recommendation_blurb}`);
      setSelectedPlan(valid.recommended_plan);
      setStage("result");
      trackEvent("esim_recommendation_shown", { destination, plan: valid.recommended_plan, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "esim",
          guest_claim_hash: await getGuestClaimHash(),
          destination,
          partner_id: getPartnerId(),
          trip_length_days: days,
          data_plan: valid.recommended_plan,
          recommendation_shown: valid.recommendation_blurb,
          cta_clicked: false,
          guardrail_triggered: guardrail.triggered,
          guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("eSIM AI error:", err);
      pushMsg("assistant", "Sorry, I couldn't generate a recommendation just now. Please try again.");
      setStage("length");
    } finally {
      setLoading(false);
    }
  };

  const handleCta = () => {
    const plan = selectedPlan || aiData?.recommended_plan || "";
    const params = new URLSearchParams({ destination: destinationSlug(destination), plan });
    const url = `${ESIM_AFFILIATE_URL}?${params.toString()}`;
    if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true }).catch(() => {});
    trackEvent("esim_cta_click", { destination, plan });
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
          input: { flowContext: `eSIM flow (going to ${destination})`, q },
        })
        .then((r) => r.data);
      setAskThread((t) => [...t, { from: "assistant", text: result }]);
    } catch (e) {
      console.error("eSIM follow-up AI error:", e);
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
            <h1 className="font-display text-2xl font-bold text-white">eSIM Planner</h1>
            <p className="text-xs text-white/50">Chat with Dbuddy AI</p>
          </div>
          <ProgressDots total={3} current={STAGE_INDEX[stage] ?? 0} />
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

          {stage === "length" && (
            <DateRangeStep onConfirm={submitLength} />
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated suggestion based on what you told us — always verify exact pricing and coverage details with the provider before purchasing.</p>
              <div className="grid gap-3">
                {PLAN_TIERS.map((plan) => {
                  const isRec = plan.id === aiData.recommended_plan;
                  const isSel = plan.id === selectedPlan;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        isSel ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.05] hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{plan.title}</span>
                            {isRec && (
                              <span className="text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Recommended for you
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 mt-0.5">{plan.subtitle} · {plan.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <ContactCaptureStep
                flowType="esim"
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
                    Buy eSIM →
                  </button>
                  <p className="text-[10px] text-white/40 text-center -mt-2">Affiliate link · you may be redirected to our eSIM partner</p>
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