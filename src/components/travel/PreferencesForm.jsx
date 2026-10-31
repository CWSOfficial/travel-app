import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LocationAutocomplete from "@/components/travel/LocationAutocomplete";
import { detectUserCity } from "@/lib/geolocation";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { saveGuestSession } from "@/lib/guestSession";
import GoogleIcon from "@/components/GoogleIcon";
import {
  ChevronRight, ChevronLeft, Loader2, MapPin, Calendar,
  Clock, Wallet, Compass, Users, Phone, Mail, Search, Shuffle, Globe, Save
} from "lucide-react";

const BUDGETS = [
  { value: "budget", label: "💚 Budget", desc: "Affordable & smart" },
  { value: "mid_range", label: "✈️ Mid-Range", desc: "Best value" },
  { value: "luxury", label: "💎 Luxury", desc: "Premium experience" },
];

const STYLES = [
  { value: "beach", label: "🏖️ Beach" },
  { value: "adventure", label: "🧗 Adventure" },
  { value: "cultural", label: "🏛️ Cultural" },
  { value: "relaxation", label: "🧘 Relaxation" },
  { value: "mixed", label: "🌍 Mixed" },
];

const GROUPS = [
  { value: "solo", label: "🧍 Solo" },
  { value: "couple", label: "👫 Couple" },
  { value: "family", label: "👨‍👩‍👧 Family/Group" },
];

export default function PreferencesForm({ onSubmit, isLoading, initialDestination }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState(initialDestination ? "known" : null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    departure_city: "",
    destination_preference: initialDestination || "",
    start_date: "",
    end_date: "",
    budget: "",
    travel_style: "",
    group_type: "",
    num_travelers: 1,
    nationality: "",
    passport_country: "",
    email: "",
    phone: "",
    notification_method: "email",
  });

  // Dynamic step list — logged-in users skip contact details entirely.
  const STEPS = isAuthenticated
    ? [{ title: "Trip Details" }, { title: "Your Style" }]
    : [{ title: "Trip Details" }, { title: "Your Style" }, { title: "Save Your Itinerary" }];
  const lastStep = STEPS.length - 1;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const [dateError, setDateError] = useState("");
  const [locationDetected, setLocationDetected] = useState(false);

  // Autofill departure city using geolocation (browser GPS → IP fallback)
  useEffect(() => {
    if (form.departure_city) return;
    detectUserCity().then((city) => {
      if (city) {
        setForm((f) => f.departure_city ? f : { ...f, departure_city: city });
        setLocationDetected(true);
      }
    });
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleDateChange = (val) => {
    if (val && val < tomorrowStr) {
      setDateError("Start date must be at least tomorrow. Please choose a future date.");
    } else {
      setDateError("");
    }
    set("start_date", val);
  };

  const step0Valid = form.departure_city && form.start_date && !dateError && form.end_date &&
    (mode === "suggest" || (mode === "known" && form.destination_preference));
  const step1Valid = form.budget && form.travel_style && form.group_type;
  const step2Valid = true; // Guest step 2 is an action card — always "valid"
  const canNext = [step0Valid, step1Valid, step2Valid][step];

  const buildPayload = () => {
    const computedDays = form.start_date && form.end_date
      ? Math.max(1, Math.round((new Date(form.end_date + "T00:00:00") - new Date(form.start_date + "T00:00:00")) / 86400000))
      : 0;
    return {
      ...form,
      mode,
      duration_days: computedDays,
      num_travelers: parseInt(form.num_travelers),
      email: isAuthenticated ? (user?.email || form.email || "") : form.email,
    };
  };

  const handleSubmit = () => {
    onSubmit(buildPayload());
  };

  // Guest auth flows — save form data so it survives the auth redirect, then auto-submits on return.
  const handleGoogleAuth = () => {
    saveGuestSession({ formData: buildPayload(), pendingFormSubmit: true });
    base44.auth.loginWithProvider("google", window.location.pathname);
  };

  const handleEmailSignup = () => {
    saveGuestSession({ formData: buildPayload(), pendingFormSubmit: true });
    navigate("/register");
  };

  const handleSignIn = () => {
    saveGuestSession({ formData: buildPayload(), pendingFormSubmit: true });
    navigate("/login");
  };

  // Mode selection screen
  if (!mode) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Step 1 of {STEPS.length}</p>
          <h2 className="text-3xl font-black mb-2 tracking-tight">How would you like to plan?</h2>
          <p className="text-muted-foreground text-sm">Choose your planning style — we'll handle the rest.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("known")}
            className="group p-6 rounded-2xl border-2 border-border bg-white hover:border-slate-900 hover:shadow-xl transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors">
              <Search className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-bold text-base mb-1.5">I know my destination</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter a specific place. We'll check passport & visa requirements, pull the real-time safety index, and find the best deals.
            </p>
          </button>
          <button
            onClick={() => setMode("suggest")}
            className="group p-6 rounded-2xl border-2 border-border bg-white hover:border-slate-900 hover:shadow-xl transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors">
              <Shuffle className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-bold text-base mb-1.5">Pick the best for me</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tell us your dates and budget — AI recommends 4 top destinations ranked by safety, visa ease, and value.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Mode badge + back */}
      <button onClick={() => setMode(null)} className="text-xs text-muted-foreground hover:text-foreground mb-5 flex items-center gap-1">
        ← Change planning mode
      </button>

      <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium">
        {mode === "known" ? <Search className="w-3 h-3" /> : <Shuffle className="w-3 h-3" />}
        {mode === "known" ? "I know my destination" : "AI will pick for me"}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${i === step ? "bg-black text-white" : i < step ? "bg-black/20 text-black" : "bg-muted text-muted-foreground"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? "bg-black" : "bg-muted"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm font-medium text-muted-foreground">{STEPS[step].title}</span>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {mode === "known" && (
              <div className="space-y-2">
                <Label className="font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500" /> Where do you want to go?</Label>
                <LocationAutocomplete
                  value={form.destination_preference}
                  onChange={val => set("destination_preference", val)}
                  placeholder="e.g. Bali, Paris, Tokyo, New York..."
                />
                <p className="text-xs text-muted-foreground">We'll check visa requirements & safety for this destination.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Departing from</Label>
              <LocationAutocomplete
                value={form.departure_city}
                onChange={val => { set("departure_city", val); setLocationDetected(false); }}
                placeholder="e.g. London, New York, Dubai..."
              />
              {locationDetected && (
                <p className="text-xs text-teal-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> We detected your location — change if needed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Start date</Label>
              <Input
                type="date"
                min={tomorrowStr}
                value={form.start_date}
                onChange={e => handleDateChange(e.target.value)}
                className={`h-12 rounded-xl border-border ${dateError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
              {dateError && <p className="text-xs text-red-600 font-medium">{dateError}</p>}
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> End date</Label>
              <Input
                type="date"
                min={form.start_date || tomorrowStr}
                value={form.end_date}
                onChange={e => set("end_date", e.target.value)}
                className="h-12 rounded-xl border-border"
              />
              {form.start_date && form.end_date && (
                <p className="text-xs text-muted-foreground">
                  {Math.max(1, Math.round((new Date(form.end_date + "T00:00:00") - new Date(form.start_date + "T00:00:00")) / 86400000))} days
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm flex items-center gap-2"><Globe className="w-4 h-4" /> Your passport country</Label>
              <LocationAutocomplete
                value={form.passport_country}
                onChange={val => set("passport_country", val)}
                placeholder="e.g. United Kingdom, United States, India..."
                countriesOnly
              />
              <p className="text-xs text-muted-foreground">Helps personalize your trip. Visa guidance currently reflects UK FCDO advisories — always verify entry rules with your embassy.</p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="space-y-3">
              <Label className="font-semibold text-sm flex items-center gap-2"><Wallet className="w-4 h-4" /> Budget range</Label>
              <div className="grid grid-cols-3 gap-2">
                {BUDGETS.map(b => (
                  <button key={b.value} onClick={() => set("budget", b.value)} className={`p-3 rounded-xl border text-center transition-all ${form.budget === b.value ? "border-black bg-black text-white" : "border-border bg-white hover:border-black/40"}`}>
                    <p className="text-sm font-semibold">{b.label}</p>
                    <p className={`text-xs mt-0.5 ${form.budget === b.value ? "text-white/70" : "text-muted-foreground"}`}>{b.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-semibold text-sm flex items-center gap-2"><Compass className="w-4 h-4" /> Travel style</Label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => set("travel_style", s.value)} className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${form.travel_style === s.value ? "border-black bg-black text-white" : "border-border bg-white hover:border-black/40"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Who's travelling?</Label>
              <div className="flex gap-2">
                {GROUPS.map(g => (
                  <button key={g.value} onClick={() => setForm(f => ({ ...f, group_type: g.value, num_travelers: g.value === "solo" ? 1 : g.value === "couple" ? 2 : (f.num_travelers && f.num_travelers >= 2 ? f.num_travelers : 2) }))} className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${form.group_type === g.value ? "border-black bg-black text-white" : "border-border bg-white hover:border-black/40"}`}>
                    {g.label}
                  </button>
                ))}
              </div>
              {form.group_type === "couple" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Number of travellers</Label>
                  <Input type="number" readOnly value={2} className="h-10 mt-1 rounded-xl w-24 bg-muted/50" />
                </div>
              )}
              {form.group_type === "family" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Number of travellers</Label>
                  <Input type="number" min="2" max="20" value={form.num_travelers} onChange={e => set("num_travelers", e.target.value)} className="h-10 mt-1 rounded-xl w-24" />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2 — Guest only: "Save Your Itinerary" card with auth options + guest preview */}
        {step === 2 && !isAuthenticated && (
          <motion.div key="step2-guest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3">
                <Save className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Save Your Itinerary</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Create a free profile to save your trip, get visa alerts, and access your itinerary anytime.
              </p>
            </div>

            <Button onClick={handleGoogleAuth} variant="outline" className="w-full h-12 rounded-xl text-sm font-medium gap-2">
              <GoogleIcon className="w-5 h-5" />
              Continue with Google
            </Button>

            <Button onClick={handleEmailSignup} variant="outline" className="w-full h-12 rounded-xl text-sm font-medium gap-2">
              <Mail className="w-4 h-4" />
              Sign up with Email
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button onClick={handleSignIn} className="text-primary font-medium hover:underline">
                Sign in
              </button>
            </p>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Skip sign-up and preview your itinerary now — you can always create a profile later to save your trip.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-full gap-2 px-6">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        )}
        {step < lastStep ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex-1 rounded-full bg-black hover:bg-black/80 gap-2 h-12">
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 rounded-full bg-black hover:bg-black/80 h-12 gap-2">
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Revealing…</>
              : isAuthenticated ? "✨ Reveal Top 3 Destinations" : "Preview Itinerary as Guest →"
            }
          </Button>
        )}
      </div>
    </div>
  );
}