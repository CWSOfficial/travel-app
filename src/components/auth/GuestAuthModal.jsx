import { useState } from "react";
import { motion } from "framer-motion";
import { X, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { base44 } from "@/api/base44Client";
import GoogleIcon from "@/components/GoogleIcon";
import { trackEvent } from "@/lib/analytics";

export default function GuestAuthModal({ onClose, onSuccess, triggerReason = "continue", heading: headingProp, subtitle: subtitleProp }) {
  const [tab, setTab] = useState("register"); // "register" | "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const heading = headingProp || "Create your free account to see flights & hotels";
  const subtitle = subtitleProp || "Your trip details are saved — just sign in to continue.";

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", window.location.pathname);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "register") {
        await base44.auth.register({ email, password });
        setShowOtp(true);
      } else {
        await base44.auth.loginViaEmailPassword(email, password);
        trackEvent("login", { method: "email" });
        onSuccess?.();
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      trackEvent("sign_up", { method: "email" });
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  // ── OTP verification step (shown after registration) ──
  if (showOtp) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="font-black text-lg leading-tight">Verify your email</h2>
                <p className="text-sm text-muted-foreground mt-1">We sent a code to {email}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ml-3 flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                autoFocus
                autoComplete="one-time-code"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="w-full h-12 rounded-xl font-bold"
              onClick={handleVerifyOtp}
              disabled={loading || otpCode.length < 6}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
              ) : (
                "Verify & continue →"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Didn't receive the code?{" "}
              <button onClick={handleResendOtp} className="text-primary font-medium hover:underline">
                Resend
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="font-black text-lg leading-tight">{heading}</h2>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center ml-3 flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-4"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl border border-border overflow-hidden mb-4">
            <button
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "register" ? "bg-black text-white" : "text-muted-foreground hover:bg-muted"}`}
            >
              Create account
            </button>
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "login" ? "bg-black text-white" : "text-muted-foreground hover:bg-muted"}`}
            >
              Sign in
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                required
                autoFocus
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={tab === "register" ? "Choose a password" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {tab === "register" ? "Creating account..." : "Signing in..."}</>
              ) : (
                tab === "register" ? "Create account & continue →" : "Sign in & continue →"
              )}
            </Button>
          </form>

          <p className="text-center text-[10px] text-muted-foreground mt-4 leading-relaxed">
            Your trip data is saved. By continuing you agree to our{" "}
            <a href="/terms" className="underline">Terms</a> &amp; <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}