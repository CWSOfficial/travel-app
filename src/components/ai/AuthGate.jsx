import { motion } from "framer-motion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSENT = "We'll only use this to save your report to your DheeVoy profile and for occasional relevant travel updates — opt out anytime.";

// Inline auth gate for the Weather / Safety / Visa flows. Shown only when the
// user taps the flow's CTA and no authenticated session or previously-captured
// contact exists. On submit it resolves with (name, email) so the parent can
// auto-execute the original CTA action without a second click.
export default function AuthGate({ open, title = "Save Your Trip Report", subtitle = "Enter your details to save your tailored advice and unlock instant access.", onResolved }) {
  if (!open) return null;

  const handle = (e) => {
    const name = e.currentTarget.form?.name?.value?.trim() || "";
    const email = e.currentTarget.form?.email?.value?.trim() || "";
    if (!EMAIL_RE.test(email) || !name) return;
    onResolved(name, email);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 sm:pb-4">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => { e.preventDefault(); handle({ currentTarget: { form: e.target } }); }}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0D1F3C] p-5 shadow-2xl"
      >
        <h3 className="font-display text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-white/60 mt-1">{subtitle}</p>
        <div className="space-y-2 mt-4">
          <input
            name="name"
            placeholder="Full name"
            autoComplete="name"
            className="w-full rounded-2xl bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
          />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            className="w-full rounded-2xl bg-white/[0.06] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-primary/60 outline-none"
          />
        </div>
        <p className="text-[10px] text-white/40 text-center mt-3">{CONSENT}</p>
        <button
          type="submit"
          className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3 mt-3 hover:bg-primary/90 transition-colors"
        >
          Save & continue
        </button>
      </motion.form>
    </div>
  );
}