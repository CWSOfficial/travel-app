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
import DateRangeStep from "@/components/ai/DateRangeStep";
import GuestBanner from "@/components/auth/GuestBanner";
import { useResolvedContact } from "@/lib/capturedContact";
import { useFlowFollowUp } from "@/lib/useFlowFollowUp";
import { trackEvent } from "@/lib/analytics";
import { getPartnerId } from "@/lib/partnerAttribution";
import { cleanCountryName } from "@/lib/flagEmoji";
import { validateVisaResult, VISA_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { Send, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

const COMMON_PASSPORTS = [
  "United States", "United Kingdom", "Canada", "Australia", "India",
  "Germany", "France", "Philippines", "Nigeria", "Brazil",
];

const PURPOSES = ["Tourism", "Vacation", "Business", "Conference", "Remote Work", "Nomad"];

const STAGE_INDEX = { passport: 0, destination: 1, when: 2, ret: 3, length: 3, purpose: 4, loading: 5, result: 5 };

// ── Pure date arithmetic (computed in code, never by the LLM) ──
const parseDate = (s) => (s ? new Date(s + "T00:00:00") : null);
const addMonths = (d, m) => { const n = new Date(d); n.setMonth(n.getMonth() + m); return n; };
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);
const fmtDate = (d) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null);

export default function VisaCheck() {
  const [stage, setStage] = useState("passport");
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hi! I'm Dbuddy. Let's check your visa situation 🛂\nWhat country passport do you hold?" },
  ]);
  const [passport, setPassport] = useState("");
  const [passportInput, setPassportInput] = useState("");
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [departureDate, setDepartureDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);
  const [depInput, setDepInput] = useState("");
  const [retInput, setRetInput] = useState("");
  const [tripLength, setTripLength] = useState(null); // { label, days }
  const [purpose, setPurpose] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [computed, setComputed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logId, setLogId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const contact = useResolvedContact();
  const followUp = useFlowFollowUp("visa");
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
  }, [messages, loading, aiData, computed, followUp.askOpen, followUp.askThread, followUp.askLoading, saved, showGate]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const submitPassport = (val) => {
    const p = (typeof val === "string" ? val : val?.label) || passportInput;
    if (!p?.trim()) return;
    setPassport(p.trim());
    setPassportInput("");
    pushMsg("user", p.trim());
    setStage("destination");
    setTimeout(() => pushMsg("assistant", "Where are you traveling to?"), 250);
  };

  const submitDestination = (val) => {
    const dest = (typeof val === "string" ? val : val?.label) || destInput;
    if (!dest?.trim()) return;
    setDestination(dest.trim());
    setDestInput("");
    pushMsg("user", dest.trim());
    setStage("when");
    setTimeout(() => pushMsg("assistant", "When are you traveling? Pick a date or choose flexible."), 250);
  };

  const submitFlexible = () => {
    setDepartureDate(null);
    setReturnDate(null);
    pushMsg("user", "Still deciding / flexible");
    setStage("length");
    setTimeout(() => pushMsg("assistant", "No worries. How long will your trip be?"), 250);
  };

  const submitDeparture = () => {
    if (!depInput) return;
    setDepartureDate(depInput);
    pushMsg("user", `Departing ${fmtDate(parseDate(depInput))}`);
    setStage("ret");
    setTimeout(() => pushMsg("assistant", "And your return date? Or pick a trip length instead."), 250);
  };

  const submitReturn = () => {
    if (!retInput) return;
    setReturnDate(retInput);
    const dep = parseDate(depInput);
    const ret = parseDate(retInput);
    const days = Math.max(1, daysBetween(dep, ret));
    pushMsg("user", `Returning ${fmtDate(ret)}`);
    setTripLength({ label: `${days} days`, days });
    setStage("purpose");
    setTimeout(() => pushMsg("assistant", "What is the primary purpose of your trip?"), 250);
  };

  const skipReturn = () => {
    pushMsg("user", "I'd rather pick a trip length");
    setStage("length");
    setTimeout(() => pushMsg("assistant", "When are you traveling?"), 250);
  };

  const submitLength = (days, label, startDate, endDate) => {
    setTripLength({ label, days });
    pushMsg("user", label);
    setStage("purpose");
    setTimeout(() => pushMsg("assistant", "What is the primary purpose of your trip?"), 250);
  };

  const submitPurpose = (opt) => {
    const p = typeof opt === "string" ? opt : opt.label;
    setPurpose(p);
    pushMsg("user", p);
    runVisa(p);
  };

  const runVisa = async (purposeLabel) => {
    setStage("loading");
    setLoading(true);
    pushMsg("assistant", "Checking entry rules…");

    // Deterministic date math — computed here, passed to the LLM as facts.
    const dep = parseDate(departureDate);
    const ret = parseDate(returnDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tripDays = tripLength?.days ?? null;
    const daysUntil = dep ? daysBetween(today, dep) : null;
    const passportCutoff = ret ? addMonths(ret, 6) : (dep ? addMonths(dep, 6) : null);
    const applyBy = dep ? addMonths(dep, -1) : null;
    const calc = {
      tripDays,
      tripLengthLabel: tripLength?.label || null,
      daysUntil,
      passportCutoff,
      applyBy,
      hasDates: !!dep,
    };

    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "visa_check",
        input: { passport, destination, purposeLabel, tripLengthLabel: tripLength?.label || "not specified" },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateVisaResult(result, passport, destination);
      const allowance = valid.allowance_days;
      const fitsWithin = allowance != null && calc.tripDays != null ? calc.tripDays <= allowance : null;
      setAiData(valid);
      setComputed({ ...calc, allowance, fitsWithin });
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: `Likely entry: ${valid.entry_status}\n${valid.entry_status_blurb}` };
        return copy;
      });
      setStage("result");
      trackEvent("visa_recommendation_shown", { destination, passport_nationality: passport, purpose: purposeLabel, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "visa",
          guest_claim_hash: await getGuestClaimHash(),
          destination,
          partner_id: getPartnerId(),
          passport_nationality: passport,
          departure_date: departureDate || null,
          return_date: returnDate || null,
          trip_length_label: tripLength?.label || null,
          trip_length_days: calc.tripDays,
          purpose_of_trip: purposeLabel,
          entry_status: valid.entry_status,
          passport_validity_date: passportCutoff ? passportCutoff.toISOString().slice(0, 10) : null,
          days_until_trip: calc.daysUntil,
          recommendation_shown: `${valid.entry_status} — ${valid.entry_status_blurb}`,
          cta_clicked: false,
          guardrail_triggered: guardrail.triggered,
          guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Visa Check AI error:", err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: "Sorry, I couldn't check entry rules just now. Please try again." };
        return copy;
      });
      setStage("purpose");
    } finally {
      setLoading(false);
    }
  };

  const runSave = (name, email) => {
    if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true, contact_name: name, contact_email: email }).catch(() => {});
    setSaved(true);
    trackEvent("visa_cta_click", { destination, passport_nationality: passport });
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
            <h1 className="font-display text-2xl font-bold text-white">Visa Check</h1>
            <p className="text-xs text-white/50">Chat with Dbuddy AI</p>
          </div>
          <ProgressDots total={6} current={STAGE_INDEX[stage] ?? 0} />
        </header>

        <div ref={scrollRef} className="space-y-3 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {messages.map((m, i) => (
            <ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>
          ))}

          {loading && <FlowLoadingBubble />}

          {stage === "passport" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={COMMON_PASSPORTS} onSelect={(o) => submitPassport(o.label)} />
              <form onSubmit={(e) => { e.preventDefault(); submitPassport(passportInput); }} className="flex gap-2">
                <input
                  value={passportInput}
                  onChange={(e) => setPassportInput(e.target.value)}
                  placeholder="Type your passport country…"
                  className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
                />
                <button type="submit" className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {stage === "destination" && (
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
                  placeholder="Type a destination country…"
                  className="flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
                />
                <button type="submit" className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {stage === "when" && (
            <div className="space-y-3 pt-2">
              <form onSubmit={(e) => { e.preventDefault(); submitDeparture(); }} className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <input
                    type="date"
                    value={depInput}
                    onChange={(e) => setDepInput(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>
                <button type="submit" disabled={!depInput} className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="pt-1">
                <QuickReplies options={[{ label: "Still deciding / flexible", value: "flexible" }]} onSelect={submitFlexible} />
              </div>
            </div>
          )}

          {stage === "ret" && (
            <div className="space-y-3 pt-2">
              <form onSubmit={(e) => { e.preventDefault(); submitReturn(); }} className="flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <input
                    type="date"
                    value={retInput}
                    min={depInput || undefined}
                    onChange={(e) => setRetInput(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                  />
                </div>
                <button type="submit" disabled={!retInput} className="rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="pt-1">
                <QuickReplies options={[{ label: "I'd rather pick a trip length", value: "skip" }]} onSelect={skipReturn} />
              </div>
            </div>
          )}

          {stage === "length" && (
            <DateRangeStep onConfirm={submitLength} />
          )}

          {stage === "purpose" && (
            <div className="pt-2">
              <QuickReplies options={PURPOSES} onSelect={submitPurpose} />
            </div>
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated guidance — always verify visa requirements with the official embassy and check related government foreign-travel-advice before travelling.</p>

              {/* Deterministic computed facts (rendered from code, not the LLM) */}
              {aiData.purpose_note && (
                <ChatBubble from="assistant">{aiData.purpose_note}</ChatBubble>
              )}
              {computed?.allowance != null && computed?.tripLengthLabel && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-white/90">
                      This route may allow stays up to <span className="font-semibold text-white">{computed.allowance} days</span>. Your <span className="font-semibold text-white">{computed.tripLengthLabel}</span> trip {computed.fitsWithin ? "fits within" : "may exceed"} that window.
                    </p>
                  </div>
                </div>
              )}
              {computed?.passportCutoff && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-sm text-white/90">Your passport should be valid through at least <span className="font-semibold text-white">{fmtDate(computed.passportCutoff)}</span> ({returnDate ? "return date" : "departure date"} + 6 months).</p>
                </div>
              )}
              {computed?.hasDates && computed?.daysUntil != null && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-sm text-white/90"><span className="font-semibold text-white">{computed.daysUntil}</span> days until your trip.</p>
                </div>
              )}
              {computed?.applyBy && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-sm text-white/90">You may want to start your application by around <span className="font-semibold text-white">{fmtDate(computed.applyBy)}</span>.</p>
                </div>
              )}

              {!saved ? (
                <button
                  type="button"
                  onClick={handleCta}
                  className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 hover:bg-primary/90 transition-colors"
                >
                  Apply for eVisa / Check Entry Rules
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