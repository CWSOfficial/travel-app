import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, CheckCircle } from "lucide-react";
import { trackContact } from "@/lib/metaCapi";

const TOPICS = ["Account Issue", "Billing & Subscription", "Technical Problem", "Feature Request", "Safety Concern", "Other"];

export default function SupportContactForm({ user }) {
  const [name, setName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    if (!name || !email || !topic || !message) return;
    setLoading(true);
    setSubmitError(null);
    try {
      // Routed through a server function so the SendEmail integration is not
      // an open mail relay from the client (rate-limited + validated server-side).
      const res = await base44.functions.invoke("submitSupportForm", { name, email, topic, message });
      const id = res.data?.id;
      if (!id) throw new Error(res.data?.error || "Submission failed");
      setSubmitted({ email, id });
      trackContact("email", { topic });
    } catch (err) {
      setSubmitError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border p-6 text-center lg:rounded-[24px] lg:border-[#e1e9f2] lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
        <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "#00E5CC" }} />
        <p className="font-bold text-base mb-1">✅ Message sent!</p>
        <p className="text-sm text-muted-foreground">
          We'll reply to <span className="font-semibold text-foreground">{submitted.email}</span> within 24 hours.
        </p>
        <p className="text-xs text-muted-foreground mt-2">Reference: {submitted.id}</p>
        <button
          onClick={() => { setSubmitted(null); setMessage(""); setTopic(""); }}
          className="mt-5 text-sm font-semibold underline text-muted-foreground"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden lg:rounded-[24px] lg:border-[#e1e9f2] lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
      <div className="px-5 pt-5 pb-3 border-b lg:px-6 lg:pt-6 lg:pb-4">
        <h2 className="font-bold text-base lg:text-lg">📧 Contact Our Team</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Can't find your answer? Our team typically responds within 24 hours.</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Your Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Topic</label>
          <select
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            <option value="">Select a topic...</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="Describe your issue or question in detail..."
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !name || !email || !topic || !message}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "#00E5CC" }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <><Send className="w-4 h-4" /> Send Message →</>
          )}
        </button>
        {submitError && <p className="text-xs text-red-600 mt-2">{submitError}</p>}
      </div>

      {/* Contact info */}
      <div className="border-t px-5 py-4 bg-slate-50 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Or reach us directly</p>
        <p className="text-sm">📧 <a href="mailto:support@dheevoy.com" className="font-medium text-foreground underline">support@dheevoy.com</a></p>
        <p className="text-sm">🌐 <a href="https://travel-frontend-nine-mu.vercel.app/support" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline">Open DheeVoy marketing support ↗</a></p>
        <p className="text-xs text-muted-foreground">Response time: Within 24 hours (Mon–Fri, 9am–6pm GMT)</p>
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">Also find us on:</p>
          <div className="flex gap-2">
            <a
              href="https://www.youtube.com/@DheeVoy/shorts"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/dheevoy-travel-tech-31112741a/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-[#0A66C2] hover:border-[#0A66C2] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@dheevoy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-black hover:border-black transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.2-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.06.37-.63.41-1.1 1.04-1.34 1.75-.2.51-.14 1.07-.13 1.61.09 1.18.87 2.26 1.99 2.69.99.39 2.18.26 3.06-.38.84-.57 1.35-1.53 1.35-2.54.01-3.04 0-6.08.01-9.12 0-.66.01-1.32.01-1.98z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/dheevoy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-500 hover:to-orange-400 hover:border-transparent transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
