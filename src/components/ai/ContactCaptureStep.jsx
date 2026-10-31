import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ChatBubble from "./ChatBubble";
import { getCapturedContact } from "@/lib/capturedContact";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSENT = "We'll only use this to save your report to your DheeVoy profile and for occasional relevant travel updates — opt out anytime.";

// Chat-style contact-capture step shown after the AI recommendation renders and
// before the affiliate CTA. Logged-in users get a one-line confirm with their
// profile email (and an Edit escape hatch); guests type name + email inline.
// Calls onCaptured(name, email) only when valid — the parent reveals the CTA.
export default function ContactCaptureStep({ flowType, onCaptured }) {
  const assistantPrompt = flowType === "esim"
    ? "Where should we save your plan summary? Enter your email to save it to your DheeVoy profile."
    : flowType === "attractions"
    ? "I'll save your recommendations to your DheeVoy profile — what's your email?"
    : "I'll save your recommendation to your DheeVoy profile — what's your email?";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("form"); // "form" | "confirm"
  const [authChecked, setAuthChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const prefillFromStorage = () => {
      const c = getCapturedContact();
      if (c?.email && EMAIL_RE.test(c.email)) {
        setName(c.name || "");
        setEmail(c.email);
        setMode("confirm");
      }
    };
    base44.auth.me()
      .then((u) => {
        if (u?.email && EMAIL_RE.test(u.email)) {
          setName(u.full_name || "");
          setEmail(u.email);
          setMode("confirm");
          return;
        }
        prefillFromStorage();
      })
      .catch(() => prefillFromStorage())
      .finally(() => setAuthChecked(true));
  }, []);

  if (submitted) {
    return <ChatBubble from="user">{`${name.trim()} · ${email.trim()}`}</ChatBubble>;
  }

  if (!authChecked) return null;

  const valid = EMAIL_RE.test(email.trim()) && (mode === "confirm" || name.trim().length > 0);

  const handleContinue = () => {
    if (!valid) return;
    setSubmitted(true);
    onCaptured(name.trim(), email.trim());
  };

  return (
    <div className="space-y-3">
      {mode === "confirm" ? (
        <>
          <ChatBubble from="assistant">
            Saving to your profile ({email}) — not you?{" "}
            <button type="button" onClick={() => setMode("form")} className="underline text-primary">Edit</button>
          </ChatBubble>
          <p className="text-[10px] text-white/40 text-center">{CONSENT}</p>
          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-full bg-primary text-primary-foreground font-medium py-3 hover:bg-primary/90 transition-colors"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <ChatBubble from="assistant">{assistantPrompt}</ChatBubble>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              className="w-full rounded-2xl bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
            />
          </div>
          <p className="text-[10px] text-white/40 text-center">{CONSENT}</p>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!valid}
            className="w-full rounded-full bg-primary text-primary-foreground font-medium py-3 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}