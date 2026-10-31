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
import { validateAttractionsResult, ATTRACTIONS_DISCOVERY_GUARDRAIL_BLOCK, ATTRACTIONS_CAR_RENTAL_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { Send, Loader2, Sparkles } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

// Affiliate CTA links per branch. Viator & GetYourGuide append the destination
// as a search query so users land on relevant results; affiliate params are
// preserved. GetRentACar uses the exact partner CPA link (track_id attributed).
const BRANCHES = {
  tours: {
    cta: "Explore Tours & Tickets",
    destQuestion: "Where are you traveling to?",
    step2: { question: "Who is traveling with you?", type: "chips", options: ["Solo", "Couple", "Family with Kids", "Friends / Group"] },
    step3: { question: "What is your travel style?", type: "chips", options: ["Must-See Highlights", "Hidden Gems & Local Spots", "VIP / Skip-the-Line"] },
    affiliateUrl: (dest) => `https://www.viator.com/searchResults/all?text=${encodeURIComponent(dest)}&pid=P00310889&mcid=42383&medium=link`,
    summaryTitle: (dest) => `Tours & tickets in ${dest}`,
  },
  things_to_do: {
    cta: "View Curated Activities",
    destQuestion: "Where are you headed?",
    step2: { question: "What are your main interests?", type: "multi", options: ["History & Culture", "Nature & Wildlife", "Food & Nightlife", "Kids & Family", "Art & Museums"] },
    step3: { question: "What pace do you prefer?", type: "chips", options: ["Relaxed & Casual", "Moderate", "Action-Packed"] },
    affiliateUrl: (dest) => `https://www.getyourguide.com/s/?q=${encodeURIComponent(dest)}&partner_id=YIJSN5X&cmp=short-url`,
    summaryTitle: (dest) => `Things to do in ${dest}`,
  },
  car_rental: {
    cta: "Compare Rental Cars",
    destQuestion: "Where will you pick up the car?",
    step2: { question: "When do you need the car?", type: "chips", options: ["1–3 days", "4–7 days", "1–2 weeks", "2+ weeks"] },
    step3: { question: "What type of vehicle fits your trip?", type: "chips", options: ["Compact / Economy", "SUV / Family", "Luxury / Convertible"] },
    affiliateUrl: () => `https://getrentacar.com/?track_id=d8d3801cb6564274bc934857c-738679&utm_campaign=partner&utm_medium=partner_cpa&utm_source=travelpayouts`,
    summaryTitle: (dest) => `Car rentals in ${dest}`,
  },
};

const INTENT_OPTIONS = [
  { key: "tours", emoji: "🏛️", label: "Famous Attractions & Guided Tours", sub: "Skip-the-line tickets & landmark tours" },
  { key: "things_to_do", emoji: "🎯", label: "Tailored Things to Do", sub: "Custom recommendations by interest" },
  { key: "car_rental", emoji: "🏎️", label: "Car Rentals & Road Trips", sub: "Self-drive vehicles & airport pickup" },
];

const STAGE_INDEX = { intent: 0, dest: 1, step2: 2, step3: 3, loading: 4, result: 4 };

export default function Attractions() {
  const [stage, setStage] = useState("intent");
  const [branch, setBranch] = useState(null);
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hey! I'm Dbuddy. Let's find great experiences for your trip 🎟\nWhat type of experience are you looking for today?" },
  ]);
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [step2Value, setStep2Value] = useState(null);
  const [interests, setInterests] = useState([]);
  const [customDuration, setCustomDuration] = useState("");
  const [step3Value, setStep3Value] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logId, setLogId] = useState(null);
  const [contact, setContact] = useState(null);
  const [contactCaptured, setContactCaptured] = useState(false);
  const contactLogged = useRef(false);
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
  }, [messages, loading, aiData, askOpen, askThread, askLoading, contact, contactCaptured, interests]);

  useEffect(() => {
    if (contact && logId && !contactLogged.current) {
      contactLogged.current = true;
      setCapturedContact(contact.name, contact.email);
      base44.entities.AiSessionLog.update(logId, {
        contact_name: contact.name,
        contact_email: contact.email,
        cta_clicked: true,
      }).catch(() => {});
      trackEvent("attractions_contact_captured", { destination, branch });
    }
  }, [contact, logId]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const selectIntent = (key) => {
    setBranch(key);
    const opt = INTENT_OPTIONS.find((o) => o.key === key);
    pushMsg("user", `${opt.emoji} ${opt.label}`);
    setStage("dest");
    setTimeout(() => pushMsg("assistant", BRANCHES[key].destQuestion), 250);
    trackEvent("attractions_branch_selected", { branch: key });
  };

  const submitDestination = (val) => {
    const dest = (typeof val === "string" ? val : val?.label) || destInput;
    if (!dest?.trim()) return;
    setDestination(dest.trim());
    setDestInput("");
    pushMsg("user", dest.trim());
    setStage("step2");
    setTimeout(() => pushMsg("assistant", BRANCHES[branch].step2.question), 250);
  };

  const submitStep2Chip = (val) => {
    setStep2Value(val);
    pushMsg("user", val);
    setStage("step3");
    setTimeout(() => pushMsg("assistant", BRANCHES[branch].step3.question), 250);
  };

  const submitStep2CarCustom = () => {
    const v = customDuration.trim();
    if (!v) return;
    setStep2Value(v);
    pushMsg("user", v);
    setCustomDuration("");
    setStage("step3");
    setTimeout(() => pushMsg("assistant", BRANCHES[branch].step3.question), 250);
  };

  const toggleInterest = (a) => setInterests((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  const confirmInterests = () => {
    if (!interests.length) return;
    setStep2Value(interests.join(", "));
    pushMsg("user", interests.join(", "));
    setStage("step3");
    setTimeout(() => pushMsg("assistant", BRANCHES[branch].step3.question), 250);
  };

  const submitStep3 = (val) => {
    setStep3Value(val);
    pushMsg("user", val);
    runRecommendation(val);
  };

  const buildPrompt = (s3) => {
    if (branch === "tours") {
      return `You are DheeVoy's attractions assistant. A traveler is going to ${destination}, traveling as: ${step2Value}, preferred style: ${s3}. Give a concise, factual overview of genuinely well-known sights, landmarks, museums, or guided tour experiences in ${destination} that match the travel style. Name real, well-known places a traveler can visit. Return JSON: recommendation_blurb (string, max 60 words naming real well-known places/experiences), highlights (array of up to 3 short place-based or experience labels max 8 words each).

${ATTRACTIONS_DISCOVERY_GUARDRAIL_BLOCK}`;
    }
    if (branch === "things_to_do") {
      return `You are DheeVoy's things-to-do assistant. A traveler is going to ${destination}, interests: ${step2Value}, preferred pace: ${s3}. Recommend genuinely well-known sights, activities, or experiences in ${destination} relevant to the selected interests — name real landmarks, museums, parks, neighbourhoods, or well-known experience types a traveler can visit. Return JSON: recommendation_blurb (string, max 60 words naming real well-known places/experiences relevant to the interests), highlights (array of up to 3 short place-based labels max 8 words each).

${ATTRACTIONS_DISCOVERY_GUARDRAIL_BLOCK}`;
    }
    return `You are DheeVoy's car-rental assistant. A traveler is picking up a car in ${destination}, for ${step2Value}, vehicle preference: ${s3}. Give strictly logistical guidance: vehicle type suitability for the trip and group, what to compare (insurance, mileage, fuel policy), and one general driving tip for ${destination}. Return JSON: recommendation_blurb (string, max 60 words), highlights (array of up to 3 short logistical labels max 6 words each, e.g. "Compact ideal for city", "Check local driving permit").

${ATTRACTIONS_CAR_RENTAL_GUARDRAIL_BLOCK}`;
  };

  const runRecommendation = async (s3) => {
    setStage("loading");
    setLoading(true);
    pushMsg("assistant", "Finding the best options for you…");
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "attractions_recommendation",
        input: { branch, destination, step2Value, s3 },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateAttractionsResult(result, destination);
      setAiData(valid);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: valid.recommendation_blurb };
        return copy;
      });
      setStage("result");
      trackEvent("attractions_recommendation_shown", { destination, branch, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "attractions",
          guest_claim_hash: await getGuestClaimHash(),
          branch_taken: branch,
          destination,
          partner_id: getPartnerId(),
          recommendation_shown: valid.recommendation_blurb,
          cta_clicked: false,
          guardrail_triggered: guardrail.triggered,
          guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Attractions AI error:", err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate recommendations just now. Please try again." };
        return copy;
      });
      setStage("step3");
    } finally {
      setLoading(false);
    }
  };

  const handleCta = () => {
    const url = BRANCHES[branch].affiliateUrl(destination);
    if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true }).catch(() => {});
    trackEvent("attractions_cta_click", { destination, branch });
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
          input: { flowContext: `attractions flow (${branch}, going to ${destination})`, q },
        })
        .then((r) => r.data);
      setAskThread((t) => [...t, { from: "assistant", text: result }]);
    } catch (e) {
      console.error("Attractions follow-up AI error:", e);
      setAskThread((t) => [...t, { from: "assistant", text: "Sorry, I couldn't answer that right now." }]);
    } finally {
      setAskLoading(false);
    }
  };

  const cfg = branch ? BRANCHES[branch] : null;

  return (
    <div className="min-h-screen bg-[#0A1628] pb-24 lg:bg-[linear-gradient(180deg,#f2f6ff_0%,#faf8ff_42%,#f7fbff_100%)]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:max-w-5xl lg:px-8 lg:pt-12">
        <BackToChecklist />
        <header className="flex items-center justify-between mb-4 lg:mb-6 lg:rounded-[28px] lg:border lg:border-[#dfe8f3] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_68%,#e9f7fa_100%)] lg:px-8 lg:py-6 lg:shadow-[0_16px_42px_rgba(16,33,73,0.07)]">
          <div>
            <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0878d1]">DheeVoy AI concierge</p>
            <h1 className="font-display text-2xl font-bold text-white lg:text-[34px] lg:leading-tight lg:tracking-[-0.04em] lg:text-[#071a40]">Attractions &amp; Experiences</h1>
            <p className="text-xs text-white/50 lg:mt-1 lg:text-sm lg:text-[#617084]">Chat with Dbuddy AI to find experiences for your trip.</p>
          </div>
          <ProgressDots total={4} current={STAGE_INDEX[stage] ?? 0} />
        </header>

        <div ref={scrollRef} className="attractions-chat-scroll space-y-3 overflow-y-auto lg:space-y-5 lg:rounded-[28px] lg:border lg:border-[#e4e9f2] lg:bg-white lg:p-8 lg:shadow-[0_20px_52px_rgba(16,33,73,0.075)]">
          {messages.map((m, i) => (
            <ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>
          ))}

          {loading && <FlowLoadingBubble />}

          {stage === "intent" && (
            <div className="grid gap-2 pt-2 lg:grid-cols-3 lg:gap-4">
              {INTENT_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => selectIntent(o.key)}
                  className="text-left rounded-2xl border border-white/10 bg-white/[0.05] hover:border-primary/60 hover:bg-white/[0.10] transition-colors p-3.5 lg:rounded-[22px] lg:border-[#e4e9f2] lg:bg-white lg:p-5 lg:shadow-[0_5px_18px_rgba(16,33,73,0.045)] lg:hover:-translate-y-0.5 lg:hover:border-[#a9d9f5] lg:hover:bg-[#f8fcff] lg:hover:shadow-[0_12px_26px_rgba(16,33,73,0.09)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl lg:flex lg:h-12 lg:w-12 lg:items-center lg:justify-center lg:rounded-2xl lg:bg-[#eaf7ff]">{o.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white lg:text-base lg:font-bold lg:text-[#102149]">{o.label}</div>
                      <div className="text-[11px] text-white/50 lg:mt-1 lg:text-sm lg:leading-5 lg:text-[#617084]">{o.sub}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {stage === "dest" && cfg && (
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
                  className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none lg:rounded-2xl lg:border-[#dbe4ef] lg:bg-[#f8faff] lg:px-5 lg:py-3.5 lg:text-[#102149] lg:placeholder-[#8997aa]"
                />
                <button type="submit" className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {stage === "step2" && cfg && (
            <div className="space-y-3 pt-2">
              {cfg.step2.type === "chips" && branch === "car_rental" && (
                <DateRangeStep
                  onConfirm={(days, label) => submitStep2Chip(label)}
                  startLabel="Pick-up date"
                  endLabel="Return date"
                />
              )}
              {cfg.step2.type === "chips" && branch !== "car_rental" && (
                <QuickReplies options={cfg.step2.options} onSelect={(o) => submitStep2Chip(o.label)} />
              )}
              {cfg.step2.type === "multi" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {cfg.step2.options.map((a) => {
                      const on = interests.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleInterest(a)}
                          className={`px-4 py-2 rounded-full text-sm border transition-colors lg:px-5 lg:py-2.5 lg:font-medium ${
                            on ? "border-primary bg-primary/15 text-primary lg:bg-[#eaf7ff]" : "border-white/15 bg-white/[0.05] hover:border-primary/60 lg:border-[#e4e9f2] lg:bg-white lg:text-[#3d4f70] lg:hover:bg-[#f7fbff]"
                          }`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={confirmInterests}
                    disabled={!interests.length}
                    className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </>
              )}
            </div>
          )}

          {stage === "step3" && cfg && (
            <div className="pt-2">
              <QuickReplies options={cfg.step3.options} onSelect={(o) => submitStep3(o.label)} />
            </div>
          )}

          {stage === "result" && aiData && cfg && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center lg:text-left lg:text-xs lg:text-[#617084]">AI-generated suggestion based on what you told us — always verify exact pricing and availability with the provider before booking.</p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 lg:rounded-[22px] lg:border-[#dfe8f3] lg:bg-[linear-gradient(135deg,#f7fbff,#ffffff)] lg:p-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white lg:text-lg lg:font-bold lg:text-[#102149]">{cfg.summaryTitle(destination)}</span>
                  {step3Value && <span className="text-[11px] text-white/50 lg:text-[#617084]">· {step3Value}</span>}
                </div>
                {aiData.highlights?.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {aiData.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80 lg:text-[#3d4f70]">
                        <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <ContactCaptureStep
                flowType="attractions"
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
                    {cfg.cta} →
                  </button>
                  <p className="text-[10px] text-white/40 text-center -mt-2">Affiliate link · you may be redirected to our partner</p>
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
                      className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none lg:rounded-2xl lg:border-[#dbe4ef] lg:bg-[#f8faff] lg:px-5 lg:py-3.5 lg:text-[#102149] lg:placeholder-[#8997aa]"
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
