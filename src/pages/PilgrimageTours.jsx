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
import { validatePilgrimageResult, PILGRIMAGE_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { Send, Loader2 } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

// Fixed static starter set — deliberately spans multiple regions.
// NOT sourced from DestinationSafetyCache or any trending data.
const FIXED_DESTINATIONS = ["Sri Lanka", "Italy", "Peru", "Morocco", "India"];
const EXPERIENCE_TYPES = ["Spiritual & Pilgrimage", "Cultural Heritage", "Wellness & Retreat", "Community-led Local Experiences"];
const GROUP_TYPES = ["Solo", "Couple", "Family", "Group", "Not sure yet"];
const TIMING = ["This month", "Next month", "In 2–3 months", "Flexible / researching"];

const STAGE_INDEX = { exp: 0, dest: 1, group: 2, timing: 3, notes: 4, loading: 5, result: 5 };

const SOFT_LEAD_MSG = "We're connecting travelers with curated tour specialists — leave your details and we'll follow up when we have the right match.";

export default function PilgrimageTours() {
  const [stage, setStage] = useState("exp");
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hi! I'm Dbuddy 🛕\nWhat kind of experience are you looking for?" },
  ]);
  const [experienceType, setExperienceType] = useState("");
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [groupType, setGroupType] = useState("");
  const [timing, setTiming] = useState("");
  const [notes, setNotes] = useState("");
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logId, setLogId] = useState(null);
  const [contact, setContact] = useState(null);
  const [contactCaptured, setContactCaptured] = useState(false);
  const contactLogged = useRef(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askThread, setAskThread] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (contact && logId && !contactLogged.current) {
      contactLogged.current = true;
      setCapturedContact(contact.name, contact.email);
      base44.entities.AiSessionLog.update(logId, { contact_name: contact.name, contact_email: contact.email, cta_clicked: true }).catch(() => {});
      trackEvent("pilgrimage_contact_captured", { destination });
    }
  }, [contact, logId, destination]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, aiData, askOpen, askThread, askLoading, contact, contactCaptured]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const submitExp = (label) => { setExperienceType(label); pushMsg("user", label); setStage("dest"); setTimeout(() => pushMsg("assistant", "Where are you interested in?"), 250); };
  const submitDest = (val) => {
    const d = (typeof val === "string" ? val : val?.label) || destInput;
    if (!d?.trim()) return;
    setDestination(d.trim()); setDestInput(""); pushMsg("user", d.trim());
    setStage("group"); setTimeout(() => pushMsg("assistant", "Traveling solo or with others?"), 250);
  };
  const submitGroup = (label) => { setGroupType(label); pushMsg("user", label); setStage("timing"); setTimeout(() => pushMsg("assistant", "Roughly when?"), 250); };
  const submitTiming = (label) => { setTiming(label); pushMsg("user", label); setStage("notes"); setTimeout(() => pushMsg("assistant", "Anything specific you're hoping for? (Optional — skip if you like)"), 250); };
  const submitNotes = (skip) => {
    if (!skip) { if (!notes.trim()) return; pushMsg("user", notes.trim()); }
    else { pushMsg("user", "Skip"); }
    runRecommendation();
  };

  const runRecommendation = async () => {
    setStage("loading"); setLoading(true); pushMsg("assistant", "Putting together a summary…");
    const freeText = (notes || "").trim();
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "pilgrimage_recommendation",
        input: { experienceType, destination, groupType, timing, freeText },
      });
      const result = res.data;
      const { data: valid, guardrail } = validatePilgrimageResult(result, { experienceType, destination, groupType, timing });
      setAiData(valid);
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: "assistant", text: valid.recommendation_blurb }; return c; });
      setStage("result");
      trackEvent("pilgrimage_recommendation_shown", { destination, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "pilgrimage_tours", guest_claim_hash: await getGuestClaimHash(), destination, partner_id: getPartnerId(),
          recommendation_shown: valid.recommendation_blurb,
          flow_context: { experience_type: experienceType, group_type: groupType, timing, free_text: freeText || null },
          cta_clicked: false, guardrail_triggered: guardrail.triggered, guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Pilgrimage AI error:", err);
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate a summary just now. Please try again." }; return c; });
      setStage("notes");
    } finally { setLoading(false); }
  };

  const handleAsk = async () => {
    const q = askInput.trim();
    if (!q) return;
    setAskThread((t) => [...t, { from: "user", text: q }]); setAskInput(""); setAskLoading(true);
    try {
      const result = await base44.functions
        .invoke("generateAiContent", {
          purpose: "flow_followup",
          input: { flowContext: `pilgrimage & cultural tours flow (interested in ${destination})`, q },
        })
        .then((r) => r.data);
      setAskThread((t) => [...t, { from: "assistant", text: result }]);
    } catch (e) {
      console.error("Pilgrimage follow-up AI error:", e);
      setAskThread((t) => [...t, { from: "assistant", text: "Sorry, I couldn't answer that right now." }]);
    } finally { setAskLoading(false); }
  };

  const inputCls = "flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none";
  const sendBtnCls = "rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90";

  return (
    <div className="min-h-screen bg-[#0A1628] pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <BackToChecklist />
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Pilgrimage & Cultural Tours</h1>
            <p className="text-xs text-white/50">Chat with Dbuddy AI</p>
          </div>
          <ProgressDots total={5} current={STAGE_INDEX[stage] ?? 0} />
        </header>

        <div ref={scrollRef} className="space-y-3 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {messages.map((m, i) => (<ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>))}

          {loading && <FlowLoadingBubble />}

          {stage === "exp" && (
            <div className="pt-2"><QuickReplies options={EXPERIENCE_TYPES} onSelect={(o) => submitExp(o.label)} /></div>
          )}

          {stage === "dest" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={FIXED_DESTINATIONS.map((d) => ({ label: d, value: d }))} onSelect={(o) => submitDest(o.label)} />
              <form onSubmit={(e) => { e.preventDefault(); submitDest(destInput); }} className="flex gap-2">
                <input value={destInput} onChange={(e) => setDestInput(e.target.value)} placeholder="Type a destination…" className={inputCls} />
                <button type="submit" className={sendBtnCls}><Send className="w-4 h-4" /></button>
              </form>
            </div>
          )}

          {stage === "group" && (
            <div className="pt-2"><QuickReplies options={GROUP_TYPES} onSelect={(o) => submitGroup(o.label)} /></div>
          )}

          {stage === "timing" && (
            <div className="pt-2"><QuickReplies options={TIMING} onSelect={(o) => submitTiming(o.label)} /></div>
          )}

          {stage === "notes" && (
            <div className="space-y-3 pt-2">
              <form onSubmit={(e) => { e.preventDefault(); submitNotes(false); }} className="flex gap-2">
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="A specific site, tradition, or retreat style…" className={inputCls} />
                <button type="submit" disabled={!notes.trim()} className={`${sendBtnCls} disabled:opacity-40 disabled:cursor-not-allowed`}><Send className="w-4 h-4" /></button>
              </form>
              <button type="button" onClick={() => submitNotes(true)} className="text-xs text-white/50 hover:text-white underline underline-offset-4">Skip this step</button>
            </div>
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated summary based on what you told us — no specific tour or partner is confirmed.</p>
              <ChatBubble from="assistant">{SOFT_LEAD_MSG}</ChatBubble>
              <ContactCaptureStep flowType="pilgrimage" onCaptured={(name, email) => { setContact({ name, email }); setContactCaptured(true); }} />
              {contactCaptured && (
                <>
                  <SavedReportHint />
                </>
              )}
              <PostFlowContinuation onAskQuestion={() => setAskOpen(true)} />
              {askOpen && (
                <div className="space-y-2 pt-2">
                  {askThread.map((m, i) => (<ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>))}
                  {askLoading && (<div className="flex justify-start"><div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div></div>)}
                  <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="flex gap-2">
                    <input value={askInput} onChange={(e) => setAskInput(e.target.value)} placeholder="Ask me anything about your trip…" className={inputCls} />
                    <button type="submit" disabled={askLoading} className={`${sendBtnCls} disabled:opacity-50`}>{askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
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