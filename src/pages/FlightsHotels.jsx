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
import { validateFlightsResult, validateHotelsResult, FLIGHTS_GUARDRAIL_BLOCK, HOTELS_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { buildAviasalesSearchUrl } from "@/lib/aviasalesUrl";
import { buildExpediaHotelSearchUrl } from "@/lib/hotelAffiliateLinks";
import { Send, Loader2, Minus, Plus, Calendar } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

const TRAVELER_CHIPS = ["1", "2", "3", "4+"];

const HOTEL_PRIORITIES = ["Budget-friendly", "Central location", "Family-friendly", "Business/work-friendly", "Luxury"];

const addDays = (iso, n) => {
  try {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  } catch { return ""; }
};

// Whole days from today (00:00 local) to the given ISO date — computed in code so
// the LLM never has to estimate time-until-departure/check-in in prose.
const daysUntil = (iso) => {
  if (!iso) return null;
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(iso + "T00:00:00");
    return Math.round((target - today) / 86400000);
  } catch { return null; }
};

const todayLabel = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const dateFact = (iso, label) => {
  const d = daysUntil(iso);
  if (d == null) return "";
  const weeks = Math.max(1, Math.round(d / 7));
  return ` Today is ${todayLabel()}. The ${label} is ${fmtDate(iso)}, which is ${d} day(s) from now (about ${weeks} week(s)). Reference ONLY this exact time-until value when mentioning timing — never estimate it yourself.`;
};

const fmtDate = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

const STAGE_INDEX = {
  branch: 0, f_origin: 1, f_dest: 2, f_date: 3, f_triptype: 4, f_return: 4, f_travelers: 5, loading: 6, result: 6,
  h_dest: 1, h_checkin: 2, h_nights: 3, h_guests: 4, h_priorities: 5,
};

export default function FlightsHotels() {
  const [stage, setStage] = useState("branch");
  const [branch, setBranch] = useState(null);
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hi! I'm Dbuddy ✈\nAre you looking for flights or somewhere to stay?" },
  ]);
  // flights state
  const [origin, setOrigin] = useState("");
  const [originInput, setOriginInput] = useState("");
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [tripType, setTripType] = useState(null);
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState(null);
  const [showStepper, setShowStepper] = useState(false);
  const [stepperVal, setStepperVal] = useState(4);
  // hotels state
  const [checkin, setCheckin] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [nights, setNights] = useState(null);
  const [guests, setGuests] = useState(null);
  const [hShowStepper, setHShowStepper] = useState(false);
  const [hStepperVal, setHStepperVal] = useState(4);
  const [priorities, setPriorities] = useState([]);
  // shared
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
        const names = items.map((i) => cleanCountryName(i.country_name)).filter((n) => n && n.length >= 4 && !/^[A-Z]{2}$/.test(n));
        setTrending([...new Set(names)]);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (contact && logId && !contactLogged.current) {
      contactLogged.current = true;
      setCapturedContact(contact.name, contact.email);
      base44.entities.AiSessionLog.update(logId, { contact_name: contact.name, contact_email: contact.email, cta_clicked: true }).catch(() => {});
      trackEvent(branch === "hotels" ? "hotels_contact_captured" : "flights_contact_captured", { destination });
    }
  }, [contact, logId, branch, destination]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, aiData, showStepper, hShowStepper, askOpen, askThread, askLoading, contact, contactCaptured]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const pickBranch = (b) => {
    setBranch(b);
    pushMsg("user", b === "flights" ? "Flights" : "Accommodation");
    if (b === "flights") {
      setStage("f_origin");
      setTimeout(() => pushMsg("assistant", "Great! Where are you flying from?"), 250);
    } else {
      setStage("h_dest");
      setTimeout(() => pushMsg("assistant", "Lovely! Where are you staying?"), 250);
    }
  };

  // ── Flights branch ──
  const submitOrigin = (val) => {
    const o = (typeof val === "string" ? val : val?.label) || originInput;
    if (!o?.trim()) return;
    setOrigin(o.trim()); setOriginInput(""); pushMsg("user", o.trim());
    setStage("f_dest");
    setTimeout(() => pushMsg("assistant", "And where are you flying to?"), 250);
  };
  const submitDest = (val) => {
    const d = (typeof val === "string" ? val : val?.label) || destInput;
    if (!d?.trim()) return;
    setDestination(d.trim()); setDestInput(""); pushMsg("user", d.trim());
    setStage("f_date");
    setTimeout(() => pushMsg("assistant", "When are you traveling?"), 250);
  };
  const submitDate = (flexible) => {
    if (flexible) {
      pushMsg("user", "Flexible / just researching"); setDepartDate("");
      setStage("f_triptype"); setTimeout(() => pushMsg("assistant", "Round trip or one-way?"), 250); return;
    }
    if (!departDate) return;
    pushMsg("user", fmtDate(departDate));
    setStage("f_triptype"); setTimeout(() => pushMsg("assistant", "Round trip or one-way?"), 250);
  };
  const submitTripType = (tt) => {
    setTripType(tt); pushMsg("user", tt);
    if (tt === "Round trip") { setStage("f_return"); setTimeout(() => pushMsg("assistant", "When's your return date?"), 250); }
    else { setStage("f_travelers"); setTimeout(() => pushMsg("assistant", "How many travelers?"), 250); }
  };
  const submitReturn = () => {
    if (!returnDate) return;
    pushMsg("user", fmtDate(returnDate));
    setStage("f_travelers"); setTimeout(() => pushMsg("assistant", "How many travelers?"), 250);
  };
  const submitTravelersChip = (chip) => {
    if (chip === "4+") { setShowStepper(true); return; }
    const n = parseInt(chip, 10); setTravelers(n); pushMsg("user", chip); runFlights(n);
  };
  const confirmStepper = () => {
    setTravelers(stepperVal); pushMsg("user", `${stepperVal} travelers`); setShowStepper(false); runFlights(stepperVal);
  };

  const runFlights = async (t) => {
    setStage("loading"); setLoading(true); pushMsg("assistant", "Putting together some guidance…");
    const dateLabel = departDate ? fmtDate(departDate) : "flexible dates";
    const fact = departDate ? dateFact(departDate, "departure date") : "";
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "flights_guidance",
        input: { origin, destination, dateLabel, tripType, travelers: t, fact },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateFlightsResult(result, { origin, destination });
      setAiData(valid);
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: "assistant", text: valid.recommendation_blurb }; return c; });
      setStage("result");
      trackEvent("flights_recommendation_shown", { destination, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "flights", guest_claim_hash: await getGuestClaimHash(), destination, partner_id: getPartnerId(),
          traveler_count: t, recommendation_shown: valid.recommendation_blurb,
          flow_context: { origin, departure_date: departDate || null, trip_type: tripType, return_date: returnDate || null, flexible: !departDate },
          cta_clicked: false, guardrail_triggered: guardrail.triggered, guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Flights AI error:", err);
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate guidance just now. Please try again." }; return c; });
      setStage("f_travelers");
    } finally { setLoading(false); }
  };

  // ── Hotels branch ──
  const submitHDest = (val) => {
    const d = (typeof val === "string" ? val : val?.label) || destInput;
    if (!d?.trim()) return;
    setDestination(d.trim()); setDestInput(""); pushMsg("user", d.trim());
    setStage("h_checkin"); setTimeout(() => pushMsg("assistant", "When's your stay?"), 250);
  };
  const submitCheckin = (flexible) => {
    if (flexible) {
      pushMsg("user", "Flexible / just researching"); setCheckin("");
      setStage("h_nights"); setTimeout(() => pushMsg("assistant", "When's your check-out date?"), 250); return;
    }
    if (!checkin) return;
    pushMsg("user", fmtDate(checkin));
    setStage("h_nights"); setTimeout(() => pushMsg("assistant", "When's your check-out date?"), 250);
  };
  const submitCheckout = () => {
    if (!checkoutDate || !checkin) return;
    const nightsCount = Math.max(1, Math.round((new Date(checkoutDate + "T00:00:00") - new Date(checkin + "T00:00:00")) / 86400000));
    setNights({ label: `${nightsCount} night${nightsCount !== 1 ? "s" : ""}`, days: nightsCount, checkoutDate });
    pushMsg("user", `${nightsCount} night${nightsCount !== 1 ? "s" : ""} (until ${fmtDate(checkoutDate)})`);
    setStage("h_guests"); setTimeout(() => pushMsg("assistant", "How many guests?"), 250);
  };
  const submitGuestsChip = (chip) => {
    if (chip === "4+") { setHShowStepper(true); return; }
    const n = parseInt(chip, 10); setGuests(n); pushMsg("user", chip);
    setStage("h_priorities"); setTimeout(() => pushMsg("assistant", "What matters most for this stay?"), 250);
  };
  const confirmHStepper = () => {
    setGuests(hStepperVal); pushMsg("user", `${hStepperVal} guests`); setHShowStepper(false);
    setStage("h_priorities"); setTimeout(() => pushMsg("assistant", "What matters most for this stay?"), 250);
  };
  const togglePriority = (p) => setPriorities((s) => s.includes(p) ? s.filter((x) => x !== p) : [...s, p]);
  const confirmPriorities = () => { pushMsg("user", priorities.length ? priorities.join(", ") : "No preference"); runHotels(); };

  const runHotels = async () => {
    setStage("loading"); setLoading(true); pushMsg("assistant", "Putting together some guidance…");
    const nightsLabel = nights?.label || "your stay";
    const fact = checkin ? dateFact(checkin, "check-in date") : "";
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "hotels_guidance",
        input: { destination, nightsLabel, guests, priorities: priorities.length ? priorities.join(", ") : "none specified", fact },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateHotelsResult(result, { destination });
      setAiData(valid);
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: "assistant", text: valid.recommendation_blurb }; return c; });
      setStage("result");
      trackEvent("hotels_recommendation_shown", { destination, guardrail_triggered: guardrail.triggered });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "hotels", guest_claim_hash: await getGuestClaimHash(), destination, partner_id: getPartnerId(),
          traveler_count: guests, recommendation_shown: valid.recommendation_blurb,
          flow_context: { checkin_date: checkin || null, nights: nightsLabel, priorities, flexible: !checkin },
          cta_clicked: false, guardrail_triggered: guardrail.triggered, guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Hotels AI error:", err);
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate guidance just now. Please try again." }; return c; });
      setStage("h_priorities");
    } finally { setLoading(false); }
  };

  const handleCta = () => {
    if (branch === "flights") {
      const url = buildAviasalesSearchUrl(origin, destination, departDate || "", returnDate || "");
      if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true }).catch(() => {});
      trackEvent("flights_cta_click", { destination });
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const checkout = nights?.checkoutDate || (checkin ? addDays(checkin, nights?.days || 5) : "");
      const url = buildExpediaHotelSearchUrl(destination, checkin || "", checkout, guests || 1);
      if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true }).catch(() => {});
      trackEvent("hotels_cta_click", { destination });
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleAsk = async () => {
    const q = askInput.trim();
    if (!q) return;
    setAskThread((t) => [...t, { from: "user", text: q }]); setAskInput(""); setAskLoading(true);
    try {
      const result = await base44.functions
        .invoke("generateAiContent", {
          purpose: "flow_followup",
          input: {
            flowContext: `${branch === "flights" ? "flights" : "hotels"} flow (${branch === "flights" ? `flying to ${destination}` : `staying in ${destination}`})`,
            q,
          },
        })
        .then((r) => r.data);
      setAskThread((t) => [...t, { from: "assistant", text: result }]);
    } catch (e) {
      console.error("Flights/Hotels follow-up AI error:", e);
      setAskThread((t) => [...t, { from: "assistant", text: "Sorry, I couldn't answer that right now." }]);
    } finally { setAskLoading(false); }
  };

  const inputCls = "flex-1 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none";
  const sendBtnCls = "rounded-full bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90";
  const dateCls = "w-full rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white focus:border-primary/60 outline-none";
  const contBtnCls = "w-full rounded-full bg-primary text-primary-foreground font-medium py-2.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-[#0A1628] pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <BackToChecklist />
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Flights & Hotels</h1>
            <p className="text-xs text-white/50">Chat with Dbuddy AI</p>
          </div>
          <ProgressDots total={6} current={STAGE_INDEX[stage] ?? 0} />
        </header>

        <div ref={scrollRef} className="space-y-3 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {messages.map((m, i) => (<ChatBubble key={i} from={m.from}>{m.text}</ChatBubble>))}

          {loading && <FlowLoadingBubble />}

          {stage === "branch" && (
            <div className="pt-2">
              <QuickReplies options={[{ label: "Flights", value: "flights" }, { label: "Accommodation", value: "hotels" }]} onSelect={(o) => pickBranch(o.value)} />
            </div>
          )}

          {stage === "f_origin" && (
            <div className="space-y-3 pt-2">
              {trending.length > 0 && <QuickReplies options={trending.slice(0, 6).map((t) => ({ label: t, value: t }))} onSelect={(o) => submitOrigin(o.label)} />}
              <form onSubmit={(e) => { e.preventDefault(); submitOrigin(originInput); }} className="flex gap-2">
                <input value={originInput} onChange={(e) => setOriginInput(e.target.value)} placeholder="Type a city…" className={inputCls} />
                <button type="submit" className={sendBtnCls}><Send className="w-4 h-4" /></button>
              </form>
            </div>
          )}

          {stage === "f_dest" && (
            <div className="space-y-3 pt-2">
              {trending.length > 0 && <QuickReplies options={trending.slice(0, 6).map((t) => ({ label: t, value: t }))} onSelect={(o) => submitDest(o.label)} />}
              <form onSubmit={(e) => { e.preventDefault(); submitDest(destInput); }} className="flex gap-2">
                <input value={destInput} onChange={(e) => setDestInput(e.target.value)} placeholder="Type a city…" className={inputCls} />
                <button type="submit" className={sendBtnCls}><Send className="w-4 h-4" /></button>
              </form>
            </div>
          )}

          {stage === "f_date" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={[{ label: "Flexible / just researching", value: "flex" }]} onSelect={() => submitDate(true)} />
              <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} className={dateCls} />
              <button type="button" disabled={!departDate} onClick={() => submitDate(false)} className={contBtnCls}>Continue</button>
            </div>
          )}

          {stage === "f_triptype" && (
            <div className="pt-2"><QuickReplies options={[{ label: "Round trip", value: "Round trip" }, { label: "One-way", value: "One-way" }]} onSelect={(o) => submitTripType(o.value)} /></div>
          )}

          {stage === "f_return" && (
            <div className="space-y-3 pt-2">
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={dateCls} />
              <button type="button" disabled={!returnDate} onClick={submitReturn} className={contBtnCls}>Continue</button>
            </div>
          )}

          {stage === "f_travelers" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={TRAVELER_CHIPS} onSelect={(o) => submitTravelersChip(o.label)} />
              {showStepper && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStepperVal((v) => Math.max(4, v - 1))} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center hover:border-primary/60"><Minus className="w-4 h-4" /></button>
                  <span className="w-10 text-center font-semibold text-white">{stepperVal}</span>
                  <button type="button" onClick={() => setStepperVal((v) => v + 1)} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center hover:border-primary/60"><Plus className="w-4 h-4" /></button>
                  <button type="button" onClick={confirmStepper} className="ml-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">Continue</button>
                </div>
              )}
            </div>
          )}

          {stage === "h_dest" && (
            <div className="space-y-3 pt-2">
              {trending.length > 0 && <QuickReplies options={trending.slice(0, 6).map((t) => ({ label: t, value: t }))} onSelect={(o) => submitHDest(o.label)} />}
              <form onSubmit={(e) => { e.preventDefault(); submitHDest(destInput); }} className="flex gap-2">
                <input value={destInput} onChange={(e) => setDestInput(e.target.value)} placeholder="Type a city…" className={inputCls} />
                <button type="submit" className={sendBtnCls}><Send className="w-4 h-4" /></button>
              </form>
            </div>
          )}

          {stage === "h_checkin" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={[{ label: "Flexible / just researching", value: "flex" }]} onSelect={() => submitCheckin(true)} />
              <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className={dateCls} />
              <button type="button" disabled={!checkin} onClick={() => submitCheckin(false)} className={contBtnCls}>Continue</button>
            </div>
          )}

          {stage === "h_nights" && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-white/50 px-1">Check-in: {fmtDate(checkin)}</p>
              <div className="flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 px-4 py-2.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="date"
                  value={checkoutDate}
                  min={checkin || undefined}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                  aria-label="Check-out date"
                />
              </div>
              {checkoutDate && checkin && (
                <p className="text-xs text-white/50 px-1">
                  {Math.max(1, Math.round((new Date(checkoutDate + "T00:00:00") - new Date(checkin + "T00:00:00")) / 86400000))} nights
                </p>
              )}
              <button type="button" disabled={!checkoutDate} onClick={submitCheckout} className={contBtnCls}>Continue</button>
            </div>
          )}

          {stage === "h_guests" && (
            <div className="space-y-3 pt-2">
              <QuickReplies options={TRAVELER_CHIPS} onSelect={(o) => submitGuestsChip(o.label)} />
              {hShowStepper && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setHStepperVal((v) => Math.max(4, v - 1))} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center hover:border-primary/60"><Minus className="w-4 h-4" /></button>
                  <span className="w-10 text-center font-semibold text-white">{hStepperVal}</span>
                  <button type="button" onClick={() => setHStepperVal((v) => v + 1)} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center hover:border-primary/60"><Plus className="w-4 h-4" /></button>
                  <button type="button" onClick={confirmHStepper} className="ml-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">Continue</button>
                </div>
              )}
            </div>
          )}

          {stage === "h_priorities" && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2">
                {HOTEL_PRIORITIES.map((p) => { const on = priorities.includes(p); return (
                  <button key={p} type="button" onClick={() => togglePriority(p)} className={`px-4 py-2 rounded-full text-sm border transition-colors ${on ? "border-primary bg-primary/15 text-primary" : "border-white/15 bg-white/[0.05] hover:border-primary/60"}`}>{p}</button>
                ); })}
              </div>
              <button type="button" onClick={confirmPriorities} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90">Continue</button>
            </div>
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated suggestion — always verify exact pricing and availability with the provider before booking.</p>
              <ContactCaptureStep flowType="flights" onCaptured={(name, email) => { setContact({ name, email }); setContactCaptured(true); }} />
              {contactCaptured && (
                <>
                  <SavedReportHint />
                  <button type="button" onClick={handleCta} className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 hover:bg-primary/90 transition-colors">{branch === "flights" ? "Compare Flights →" : "Find Hotels →"}</button>
                  <p className="text-[10px] text-white/40 text-center -mt-2">Affiliate link · you may be redirected to our partner</p>
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