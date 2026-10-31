import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import TagSelector from "@/components/dmc/TagSelector";
import ImageUploader from "@/components/dmc/ImageUploader";
import ItineraryDayBuilder from "@/components/dmc/ItineraryDayBuilder";
import { Loader2, Check, ChevronLeft, Sparkles, CheckCircle2 } from "lucide-react";

const THEMES = ["Adventure", "Family", "Wildlife", "Heritage", "Cultural", "Beach", "Honeymoon", "Religious", "Luxury", "Offbeat"];
const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Arabic", "Mandarin", "Japanese", "Portuguese", "Italian", "Russian", "Thai"];

const STEPS = [
  { num: 1, label: "Trip Overview" },
  { num: 2, label: "Day-by-Day" },
  { num: 3, label: "Inclusions" },
  { num: 4, label: "Photos" },
];

export default function DMCSubmissionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [profile, setProfile] = useState(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    trip_name: "",
    destinations: "",
    duration_days: 1,
    duration_nights: 0,
    departure_cities: "",
    theme: [],
    languages_spoken: [],
    min_group_size: 1,
    max_group_size: 10,
    inclusions: "",
    exclusions: "",
    price_per_person: 0,
    currency: "USD",
    group_pricing: "",
    advance_deposit_percent: 20,
    cancellation_policy: "",
    photo_gallery: [],
  });
  const [days, setDays] = useState([{ day_number: 1, title: "", morning_activity: "", midday_activity: "", evening_activity: "", accommodation_name: "" }]);

  useEffect(() => {
    (async () => {
      try {
        const profiles = await base44.entities.DMCProfile.list("-created_date", 1);
        if (profiles && profiles.length > 0) {
          setProfile(profiles[0]);
        } else {
          navigate("/dmc");
        }
      } catch (e) {
        navigate("/dmc");
      }

      // If editing, load existing submission + its days
      if (editId) {
        try {
          const sub = await base44.entities.DMCSubmission.get(editId);
          setForm({
            trip_name: sub.trip_name || "",
            destinations: sub.destinations || "",
            duration_days: sub.duration_days || 1,
            duration_nights: sub.duration_nights || 0,
            departure_cities: sub.departure_cities || "",
            theme: sub.theme || [],
            languages_spoken: sub.languages_spoken || [],
            min_group_size: sub.min_group_size || 1,
            max_group_size: sub.max_group_size || 10,
            inclusions: sub.inclusions || "",
            exclusions: sub.exclusions || "",
            price_per_person: sub.price_per_person || 0,
            currency: sub.currency || "USD",
            group_pricing: sub.group_pricing || "",
            advance_deposit_percent: sub.advance_deposit_percent ?? 20,
            cancellation_policy: sub.cancellation_policy || "",
            photo_gallery: sub.photo_gallery || [],
          });
          const existingDays = await base44.entities.DMCItineraryDay.filter({ submission_id: editId });
          if (existingDays && existingDays.length > 0) {
            setDays(existingDays.sort((a, b) => a.day_number - b.day_number));
          }
        } catch (e) {
          // ignore load failure
        }
      }
    })();
  }, [editId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 1) return form.trip_name.trim() && form.destinations.trim() && form.duration_days > 0 && form.theme.length > 0 && form.price_per_person >= 0;
    if (step === 2) return days.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        dmc_profile_id: profile.id,
        dmc_partner_name: profile.business_name,
        listing_status: "pending_review",
      };

      let submissionId = editId;
      if (editId) {
        await base44.entities.DMCSubmission.update(editId, payload);
      } else {
        const created = await base44.entities.DMCSubmission.create(payload);
        submissionId = created.id;
      }

      // Sync itinerary days: delete old, create new
      if (editId) {
        const oldDays = await base44.entities.DMCItineraryDay.filter({ submission_id: editId });
        for (const d of oldDays) {
          await base44.entities.DMCItineraryDay.delete(d.id);
        }
      }
      for (const day of days) {
        await base44.entities.DMCItineraryDay.create({
          submission_id: submissionId,
          day_number: day.day_number,
          title: day.title || "",
          morning_activity: day.morning_activity || "",
          midday_activity: day.midday_activity || "",
          evening_activity: day.evening_activity || "",
          accommodation_name: day.accommodation_name || "",
        });
      }

      setSubmitted(true);
    } catch (err) {
      setError(err?.message || "Failed to submit trip. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 transition-all";
  const labelCls = "text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1";

  if (submitted) {
    return (
      <div className="min-h-screen pb-24">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Trip Submitted! 🎉</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your trip "{form.trip_name}" has been submitted for review. Our team will review it and publish it once approved. You'll see the status update in your portal.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate("/dmc")} className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold text-sm">
              Back to DMC Portal
            </button>
            <button onClick={() => { setSubmitted(false); setStep(1); navigate("/dmc/submit"); }} className="text-xs text-slate-400 hover:text-teal-300">
              Submit another trip
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">✨ {editId ? "Edit Trip" : "Submit a New Trip"}</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Fill in your trip details. You can edit anytime before review.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > s.num ? "bg-teal-500 text-black" : step === s.num ? "bg-teal-500/20 border-2 border-teal-400 text-teal-200" : "bg-white/5 border border-white/10 text-slate-500"
                }`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[9px] font-medium ${step >= s.num ? "text-teal-200" : "text-slate-500"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${step > s.num ? "bg-teal-500" : "bg-white/10"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main glass container */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-2xl rounded-3xl p-5 md:p-8 shadow-2xl space-y-5">
          {/* STEP 1: Trip Overview & Base Pricing */}
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>📌 Trip Name *</label>
                <input className={fieldCls} value={form.trip_name} onChange={(e) => set("trip_name", e.target.value)} placeholder="e.g. 7-Day Kyoto Cultural Immersion" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>📍 Destinations *</label>
                  <input className={fieldCls} value={form.destinations} onChange={(e) => set("destinations", e.target.value)} placeholder="e.g. Kyoto, Japan" />
                </div>
                <div>
                  <label className={labelCls}>🛫 Departure Cities</label>
                  <input className={fieldCls} value={form.departure_cities} onChange={(e) => set("departure_cities", e.target.value)} placeholder="e.g. Delhi, Mumbai" />
                </div>
                <div>
                  <label className={labelCls}>📅 Duration (Days) *</label>
                  <input type="number" min="1" className={fieldCls} value={form.duration_days} onChange={(e) => set("duration_days", parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className={labelCls}>🌙 Duration (Nights)</label>
                  <input type="number" min="0" className={fieldCls} value={form.duration_nights} onChange={(e) => set("duration_nights", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className={labelCls}>👥 Min Group Size</label>
                  <input type="number" min="1" className={fieldCls} value={form.min_group_size} onChange={(e) => set("min_group_size", parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className={labelCls}>👥 Max Group Size</label>
                  <input type="number" min="1" className={fieldCls} value={form.max_group_size} onChange={(e) => set("max_group_size", parseInt(e.target.value) || 10)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>🎨 Trip Theme * <span className="text-slate-500 normal-case font-normal">(select up to 3)</span></label>
                <TagSelector options={THEMES} value={form.theme} onChange={(v) => set("theme", v)} max={3} />
              </div>
              <div>
                <label className={labelCls}>🗣️ Languages Spoken</label>
                <TagSelector options={LANGUAGES} value={form.languages_spoken} onChange={(v) => set("languages_spoken", v)} max={6} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>💰 Price Per Person *</label>
                  <div className="flex gap-2">
                    <select className="bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400/50" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                      {["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD"].map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                    <input type="number" min="0" className={fieldCls} value={form.price_per_person} onChange={(e) => set("price_per_person", parseFloat(e.target.value) || 0)} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>💳 Advance Deposit (%)</label>
                  <input type="number" min="0" max="100" className={fieldCls} value={form.advance_deposit_percent} onChange={(e) => set("advance_deposit_percent", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>👥 Group Pricing Notes</label>
                <input className={fieldCls} value={form.group_pricing} onChange={(e) => set("group_pricing", e.target.value)} placeholder="e.g. Group of 6+: 10% off" />
              </div>
            </>
          )}

          {/* STEP 2: Day-by-Day Builder */}
          {step === 2 && (
            <>
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-white">📅 Day-by-Day Itinerary</h3>
                <p className="text-xs text-slate-400 mt-1">Add as many days as your trip needs. Click "+ Add Next Day" to extend.</p>
              </div>
              <ItineraryDayBuilder days={days} onChange={setDays} />
            </>
          )}

          {/* STEP 3: Inclusions, Exclusions & Cancellation */}
          {step === 3 && (
            <>
              <div>
                <label className={labelCls}>✅ Inclusions <span className="text-slate-500 normal-case font-normal">(one per line)</span></label>
                <textarea rows={6} className={fieldCls + " resize-none"} value={form.inclusions} onChange={(e) => set("inclusions", e.target.value)} placeholder={"All meals\nAll transfers\nGuided tours\nEntry tickets"} />
              </div>
              <div>
                <label className={labelCls}>❌ Exclusions <span className="text-slate-500 normal-case font-normal">(one per line)</span></label>
                <textarea rows={5} className={fieldCls + " resize-none"} value={form.exclusions} onChange={(e) => set("exclusions", e.target.value)} placeholder={"International flights\nTravel insurance\nPersonal expenses"} />
              </div>
              <div>
                <label className={labelCls}>📋 Cancellation Policy</label>
                <textarea rows={4} className={fieldCls + " resize-none"} value={form.cancellation_policy} onChange={(e) => set("cancellation_policy", e.target.value)} placeholder="e.g. Free cancellation up to 30 days before departure. 50% refund 15-30 days. No refund within 15 days." />
              </div>
            </>
          )}

          {/* STEP 4: Photo Upload */}
          {step === 4 && (
            <>
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-white">📸 Trip Photo Gallery</h3>
                <p className="text-xs text-slate-400 mt-1">Upload 5–10 high-quality photos of your trip. These will appear on the listing.</p>
              </div>
              <ImageUploader value={form.photo_gallery} onChange={(urls) => set("photo_gallery", urls)} max={10} />
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 text-red-300 rounded-xl px-4 py-2.5 text-xs">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-5 gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-sm font-medium transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <Link to="/dmc" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-sm font-medium transition-all">
              <ChevronLeft className="w-4 h-4" /> Cancel
            </Link>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold text-sm shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Sparkles className="w-4 h-4" /> Submit for Review</>}
            </button>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}