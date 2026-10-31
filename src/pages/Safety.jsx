import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import ChatBubble from "@/components/ai/ChatBubble";
import QuickReplies from "@/components/ai/QuickReplies";
import ProgressDots from "@/components/ai/ProgressDots";
import PostFlowContinuation from "@/components/ai/PostFlowContinuation";
import AuthGate from "@/components/ai/AuthGate";
import { SavedReportLink } from "@/components/ai/SavedReportHint";
import FlowLoadingBubble from "@/components/ai/FlowLoadingBubble";
import BackToChecklist from "@/components/ai/BackToChecklist";
import GuestBanner from "@/components/auth/GuestBanner";
import { useResolvedContact } from "@/lib/capturedContact";
import { useFlowFollowUp } from "@/lib/useFlowFollowUp";
import { trackEvent } from "@/lib/analytics";
import { getPartnerId } from "@/lib/partnerAttribution";
import { cleanCountryName } from "@/lib/flagEmoji";
import { validateSafetyResult, SAFETY_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { resolveSafetyScore } from "@/lib/safetyScore";
import { Send, Loader2 } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

const TRAVELER_TYPES = [
  "Solo Female Traveler",
  "Solo Male Traveler",
  "Couple",
  "Family with Kids",
  "Group of Friends",
];

const SAFETY_CONCERNS = [
  "Common Tourist Scams",
  "Safe Neighborhoods",
  "Public Transport Safety",
  "Nighttime Safety",
];

const STAGE_INDEX = { dest: 0, traveler: 1, concern: 2, loading: 3, result: 3 };

export default function Safety() {
  const [stage, setStage] = useState("dest");
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hi! I'm Dbuddy. Let's look at safety 🛡\nWhich city or destination do you want to check?" },
  ]);
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [travelerType, setTravelerType] = useState(null);
  const [concern, setConcern] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [safetyScore, setSafetyScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logId, setLogId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const contact = useResolvedContact();
  const followUp = useFlowFollowUp("safety");
  const [trending, setTrending] = useState([]);
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
  }, [messages, loading, aiData, followUp.askOpen, followUp.askThread, followUp.askLoading, saved, showGate]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const submitDestination = (val) => {
    const dest = (typeof val === "string" ? val : val?.label) || destInput;
    if (!dest?.trim()) return;
    setDestination(dest.trim());
    setDestInput("");
    pushMsg("user", dest.trim());
    setStage("traveler");
    setTimeout(() => pushMsg("assistant", "Who is traveling?"), 250);
  };

  const submitTraveler = (opt) => {
    const t = typeof opt === "string" ? opt : opt.label;
    setTravelerType(t);
    pushMsg("user", t);
    setStage("concern");
    setTimeout(() => pushMsg("assistant", "What is your main safety concern?"), 250);
  };

  const submitConcern = (opt) => {
    const c = typeof opt === "string" ? opt : opt.label;
    setConcern(c);
    pushMsg("user", c);
    runRecommendation(c);
  };

  const runRecommendation = async (safetyConcern) => {
    setStage("loading");
    setLoading(true);
    pushMsg("assistant", "Assessing the situation…");
    const scoreData = await resolveSafetyScore(destination);
    setSafetyScore(scoreData);
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "safety_summary",
        input: { travelerType, destination, safetyConcern },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateSafetyResult(result, destination);
      setAiData(valid);
      const scoreBubble = scoreData?.found && scoreData?.score != null
        ? `🛡 ${scoreData.countryName}: ${scoreData.score}/100${scoreData.isCountryLevelOnly ? " · Country-level score" : ""}`
        : null;
      setMessages((m) => {
        const copy = [...m];
        if (scoreBubble) {
          copy[copy.length - 1] = { from: "assistant", text: scoreBubble };
          return [...copy, { from: "assistant", text: valid.recommendation_blurb }];
        }
        copy[copy.length - 1] = { from: "assistant", text: valid.recommendation_blurb };
        return copy;
      });
      setStage("result");
      trackEvent("safety_recommendation_shown", { destination, traveler_type: travelerType, concern: safetyConcern, guardrail_triggered: guardrail.triggered, safety_score: scoreData?.score ?? null });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "safety",
          guest_claim_hash: await getGuestClaimHash(),
          destination,
          partner_id: getPartnerId(),
          traveler_type: travelerType,
          safety_concern: safetyConcern,
          safety_score: scoreData?.found ? scoreData.score : null,
          safety_score_country: scoreData?.found ? scoreData.countryName : null,
          recommendation_shown: valid.recommendation_blurb,
          cta_clicked: false,
          guardrail_triggered: guardrail.triggered,
          guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Safety AI error:", err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate a safety assessment just now. Please try again." };
        return copy;
      });
      setStage("concern");
    } finally {
      setLoading(false);
    }
  };

  const runSave = (name, email) => {
    if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true, contact_name: name, contact_email: email }).catch(() => {});
    setSaved(true);
    trackEvent("safety_cta_click", { destination });
    setTimeout(() => pushMsg("assistant", `Saved to your DheeVoy profile ✅ — find it anytime under Saved Reports in your Profile.`), 200);
  };

  const handleCta = () => {
    if (contact.status === "resolved") runSave(contact.name, contact.email);
    else setShowGate(true);
  };

  return (
    <div className="min-h-screen bg-[#0A1628] pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <BackToChecklist />
        <GuestBanner />
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Safety Check</h1>
            <p className="text-xs text-white/50">Chat with Dbuddy AI</p>
          </div>
          <ProgressDots total={4} current={STAGE_INDEX[stage] ?? 0} />
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

          {stage === "traveler" && (
            <div className="pt-2">
              <QuickReplies options={TRAVELER_TYPES} onSelect={submitTraveler} />
            </div>
          )}

          {stage === "concern" && (
            <div className="pt-2">
              <QuickReplies options={SAFETY_CONCERNS} onSelect={submitConcern} />
            </div>
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated guidance — always verify against the latest official government travel advisory before travelling.</p>

              {!saved ? (
                <button
                  type="button"
                  onClick={handleCta}
                  className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 hover:bg-primary/90 transition-colors"
                >
                  Get Full Safety & Scam Guide
                </button>
              ) : (
                <div className="space-y-1.5 text-center">
                  <p className="text-[10px] text-white/40">Report saved.</p>
                  <SavedReportLink />
                </div>
              )}

              <PostFlowContinuation onAskQuestion={() => followUp.setAskOpen(true)} />

              {followUp.askOpen && (
                <div className="space-y-2 pt-2">
                  {followUp.askThread.map((m, i) => (
                    <ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>
                  ))}
                  {followUp.askLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <form onSubmit={(e) => { e.preventDefault(); followUp.handleAsk(); }} className="flex gap-2">
                    <input
                      value={followUp.askInput}
                      onChange={(e) => followUp.setAskInput(e.target.value)}
                      placeholder="Ask me anything about your trip…"
                      className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
                    />
                    <button type="submit" disabled={followUp.askLoading} className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90 disabled:opacity-50">
                      {followUp.askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <AuthGate open={showGate} onResolved={(name, email) => { contact.resolve(name, email); setShowGate(false); runSave(name, email); }} />
      <BottomNav active="/" />
    </div>
  );
}