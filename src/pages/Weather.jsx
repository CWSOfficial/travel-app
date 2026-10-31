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
import { useResolvedContact } from "@/lib/capturedContact";
import { useFlowFollowUp } from "@/lib/useFlowFollowUp";
import { trackEvent } from "@/lib/analytics";
import { getPartnerId } from "@/lib/partnerAttribution";
import { cleanCountryName } from "@/lib/flagEmoji";
import { validateWeatherResult, WEATHER_GUARDRAIL_BLOCK } from "@/lib/aiGuardrails";
import { Send, Loader2 } from "lucide-react";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

const TRAVEL_TIMES = [
  { label: "This Month", value: "this_month" },
  { label: "Next Month", value: "next_month" },
  { label: "In 2–3 Months", value: "2_3_months" },
  { label: "Flexible", value: "flexible" },
  { label: "Researching", value: "researching" },
];

const ACTIVITIES = ["Beach & Swimming", "Hiking & Nature", "City Sightseeing", "Nightlife & Dining"];

const STAGE_INDEX = { dest: 0, time: 1, length: 2, activities: 3, loading: 4, result: 4 };

export default function Weather() {
  const [stage, setStage] = useState("dest");
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hey! I'm Dbuddy. Let's prep you for the weather ☀️\nWhere are you heading?" },
  ]);
  const [destination, setDestination] = useState("");
  const [destInput, setDestInput] = useState("");
  const [travelTime, setTravelTime] = useState(null);
  const [tripLength, setTripLength] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logId, setLogId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const contact = useResolvedContact();
  const followUp = useFlowFollowUp("weather");
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
  }, [messages, loading, aiData, selectedActivities, followUp.askOpen, followUp.askThread, followUp.askLoading, saved, showGate]);

  const pushMsg = (from, text) => setMessages((m) => [...m, { from, text }]);

  const submitDestination = (val) => {
    const dest = (typeof val === "string" ? val : val?.label) || destInput;
    if (!dest?.trim()) return;
    setDestination(dest.trim());
    setDestInput("");
    pushMsg("user", dest.trim());
    setStage("time");
    setTimeout(() => pushMsg("assistant", "When are you planning to travel?"), 250);
  };

  const submitTime = (opt) => {
    setTravelTime(opt);
    pushMsg("user", opt.label);
    if (opt.value === "flexible" || opt.value === "researching") {
      setStage("activities");
      setTimeout(() => pushMsg("assistant", "Got it. What are your primary planned activities?"), 250);
    } else {
      setStage("length");
      setTimeout(() => pushMsg("assistant", "When are you traveling?"), 250);
    }
  };

  const submitLength = (days, label, startDate, endDate) => {
    setTripLength({ label, days });
    pushMsg("user", label);
    setStage("activities");
    setTimeout(() => pushMsg("assistant", "What are your primary planned activities?"), 250);
  };

  const toggleActivity = (a) => {
    setSelectedActivities((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  };

  const confirmActivities = () => {
    pushMsg("user", selectedActivities.length ? selectedActivities.join(", ") : "General");
    runRecommendation(selectedActivities);
  };

  const runRecommendation = async (activities) => {
    setStage("loading");
    setLoading(true);
    pushMsg("assistant", "Checking the forecast for you…");

    // ── Resolve the real travel window + fetch real weather data ──
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthOffset = { this_month: 0, next_month: 1, "2_3_months": 2, flexible: 0, researching: 0 }[travelTime?.value] ?? 0;
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 15);
    const daysOut = Math.round((target.getTime() - today.getTime()) / 86400000);
    const mode = daysOut >= 0 && daysOut <= 14 ? "forecast" : "history";
    const histDate = new Date(target.getFullYear() - (mode === "history" ? 1 : 0), target.getMonth(), 15);
    const travelDate = (mode === "forecast" ? target : histDate).toISOString().slice(0, 10);
    const monthLabel = target.toLocaleDateString("en-GB", { month: "long" });

    let weatherData = null;
    try {
      const res = await base44.functions.invoke("fetchDestinationWeather", {
        destination_city: destination,
        travel_date: travelDate,
        mode,
      });
      const d = res?.data;
      if (d && (d.maxtemp_c != null || d.mintemp_c != null || d.temperature != null)) {
        weatherData = { maxC: d.maxtemp_c, minC: d.mintemp_c, avgC: d.temperature, condition: d.condition_text, date: d.date, mode, monthLabel };
      }
    } catch (e) {}
    setWeatherData(weatherData);

    const allowedTemps = weatherData
      ? [weatherData.avgC, weatherData.maxC, weatherData.minC].filter((n) => typeof n === "number").map(Math.round)
      : [];
    const weatherFacts = weatherData
      ? `Real weather data retrieved for this destination (${mode === "forecast" ? "forecast for the dates" : `historical typical for ${monthLabel}`}): high ${weatherData.maxC}°C, low ${weatherData.minC}°C${weatherData.condition ? `, ${weatherData.condition}` : ""}. You may reference these exact numbers only.`
      : `No real weather data was available. Do not state any specific temperature.`;

    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "weather_summary",
        input: {
          destination,
          travelTimeLabel: travelTime?.label || "soon",
          tripLengthLabel: tripLength ? tripLength.label : "",
          activities: activities.length ? activities.join(", ") : "general sightseeing",
          weatherFacts,
        },
      });
      const result = res.data;
      const { data: valid, guardrail } = validateWeatherResult(result, destination, allowedTemps);
      setAiData(valid);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: valid.recommendation_blurb };
        return copy;
      });
      setStage("result");
      trackEvent("weather_recommendation_shown", { destination, guardrail_triggered: guardrail.triggered, weather_mode: weatherData?.mode || null });
      try {
        const log = await base44.entities.AiSessionLog.create({
          flow_type: "weather",
          guest_claim_hash: await getGuestClaimHash(),
          destination,
          partner_id: getPartnerId(),
          travel_time: travelTime?.label || null,
          trip_length_label: tripLength?.label || null,
          trip_length_days: tripLength?.days ?? null,
          weather_activities: activities,
          weather_mode: weatherData?.mode || null,
          weather_high_c: weatherData?.maxC ?? null,
          weather_low_c: weatherData?.minC ?? null,
          recommendation_shown: valid.recommendation_blurb,
          cta_clicked: false,
          guardrail_triggered: guardrail.triggered,
          guardrail_reason: guardrail.reason,
        });
        setLogId(log.id);
      } catch (e) {}
    } catch (err) {
      console.error("Weather AI error:", err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { from: "assistant", text: "Sorry, I couldn't generate a weather advisory just now. Please try again." };
        return copy;
      });
      setStage("activities");
    } finally {
      setLoading(false);
    }
  };

  const runSave = (name, email) => {
    if (logId) base44.entities.AiSessionLog.update(logId, { cta_clicked: true, contact_name: name, contact_email: email }).catch(() => {});
    setSaved(true);
    trackEvent("weather_cta_click", { destination });
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
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Weather Planner</h1>
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

          {stage === "time" && (
            <div className="pt-2">
              <QuickReplies options={TRAVEL_TIMES} onSelect={submitTime} />
            </div>
          )}

          {stage === "length" && (
            <DateRangeStep onConfirm={submitLength} />
          )}

          {stage === "activities" && (
            <div className="space-y-3 pt-2">
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
            </div>
          )}

          {stage === "result" && aiData && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-white/40 text-center">AI-generated suggestion based on what you told us — always check the official forecast closer to your travel date.</p>

              {weatherData && (
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">
                    {weatherData.mode === "forecast" ? "Forecast for your dates" : `Typical weather for ${weatherData.monthLabel}`}
                  </p>
                  <p className="text-sm text-white mt-1">
                    {weatherData.maxC != null && weatherData.minC != null
                      ? <>High <span className="font-semibold text-white">{Math.round(weatherData.maxC)}°C</span> · Low <span className="font-semibold text-white">{Math.round(weatherData.minC)}°C</span></>
                      : <span className="font-semibold text-white">{weatherData.avgC != null ? `${Math.round(weatherData.avgC)}°C` : "—"} typical</span>}
                  </p>
                  {weatherData.condition && <p className="text-xs text-white/60 mt-0.5">{weatherData.condition}</p>}
                  {weatherData.mode !== "forecast" && <p className="text-[10px] text-white/40 mt-1">Based on historical data for this month.</p>}
                </div>
              )}

              {!saved ? (
                <button
                  type="button"
                  onClick={handleCta}
                  className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 hover:bg-primary/90 transition-colors"
                >
                  Save Weather & Packing List
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