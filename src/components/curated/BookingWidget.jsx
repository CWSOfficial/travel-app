import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet, ExternalLink, Upload, Loader2, ArrowRight,
  Users, User, ChevronLeft, ShieldCheck, Copy,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import posthog from "posthog-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookingProgress from "./booking/BookingProgress";
import BookingSummary from "./booking/BookingSummary";
import BookingConfirmation from "./booking/BookingConfirmation";

// Unified 3-step booking flow for curated trips. Presentation redesigned on top
// of the existing booking/receipt logic — no change to payment ownership,
// receipt upload, entity schema, or analytics events.
//   Step A — Travellers (group size + live pricing)
//   Step B — Your Details (lead traveler intake)
//   Step C — Payment & Confirmation (operator payment + receipt upload)

const COUNTRIES = [
  "United Kingdom", "United States", "India", "Australia", "Canada", "Ireland",
  "Germany", "France", "Netherlands", "Spain", "Italy", "Switzerland",
  "Sweden", "Norway", "Denmark", "Belgium", "Austria", "Portugal",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Singapore", "Japan",
  "South Korea", "China", "Hong Kong", "Thailand", "Malaysia", "Indonesia",
  "Philippines", "New Zealand", "South Africa", "Nigeria", "Kenya",
  "Egypt", "Morocco", "Turkey", "Greece", "Poland", "Czechia",
  "Hungary", "Russia", "Ukraine", "Brazil", "Argentina", "Mexico",
  "Chile", "Colombia", "Peru", "Israel", "Other",
];

const generateBookingRef = () => {
  const year = new Date().getFullYear();
  const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DV-${year}-${hash}`;
};

// Small copy-to-clipboard row for bank details — improves mobile readability.
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <span className="text-curated-muted">{label}: </span>
        <span className="text-curated-heading font-medium break-all">{value}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-curated-accent text-[11px] font-semibold flex items-center gap-1 shrink-0"
      >
        <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function BookingWidget({ curatedTrip, destination, tripId }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("A"); // A → B → C
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [form, setForm] = useState({
    lead_first_name: "",
    lead_last_name: "",
    lead_email: "",
    lead_phone: "",
    passport_country: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState(null);
  const [bookingRef, setBookingRef] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const minGroup = curatedTrip?.min_group_size || 1;
  const maxGroup = curatedTrip?.max_group_size || 20;
  const pricePerPerson = curatedTrip?.price_per_person || 0;
  const currency = curatedTrip?.currency || "USD";
  const totalTravelers = adults + children;
  const totalPayable = pricePerPerson * totalTravelers;

  // PostHog: group-size step is the initial step, so it "loads" on mount
  useEffect(() => {
    posthog.capture("group_size_viewed");
  }, []);

  // PostHog: fire the corresponding "viewed" event when reaching step B or C
  useEffect(() => {
    if (step === "B") {
      posthog.capture("traveller_details_viewed");
    } else if (step === "C") {
      posthog.capture("payment_page_viewed", {
        trip_id: curatedTrip?.id,
        group_size: totalTravelers,
        booking_value: totalPayable,
        currency,
      });
    }
  }, [step]);

  // DMC direct-payment info — fetched server-side
  const { data: paymentInfo } = useQuery({
    queryKey: ["dmc_payment_info", curatedTrip?.id],
    queryFn: async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!u) return null;
      const res = await base44.functions.invoke("getDmcPaymentInfo", { curated_trip_id: curatedTrip.id });
      return res.data?.payment_info || null;
    },
    enabled: !!curatedTrip?.id && step === "C",
  });

  const canProceedA = totalTravelers >= minGroup && totalTravelers <= maxGroup && adults >= 1;

  const validateB = () => {
    const errs = {};
    if (!form.lead_first_name.trim()) errs.lead_first_name = "Required";
    if (!form.lead_last_name.trim()) errs.lead_last_name = "Required";
    if (!form.lead_email.trim()) errs.lead_email = "Required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.lead_email)) errs.lead_email = "Invalid email";
    if (!form.lead_phone.trim()) errs.lead_phone = "Required";
    if (!form.passport_country) errs.passport_country = "Select your country";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      setPaymentMsg({ type: "error", text: "Please log in to upload your receipt." });
      e.target.value = "";
      return;
    }
    setPaying(true);
    setPaymentMsg(null);
    try {
      const uploadRes = await base44.integrations.Core.UploadPublicFile({ file });
      const receiptUrl = uploadRes?.file_url;
      if (!receiptUrl) throw new Error("Upload failed");

      const ref = generateBookingRef();
      setBookingRef(ref);

      // Re-use an existing booking for this customer+trip if present, else create
      const existing = await base44.entities.CuratedTripBooking.filter({
        curated_trip_id: curatedTrip.id,
        customer_user_id: user.id,
      });

      const bookingData = {
        curated_trip_id: curatedTrip.id,
        dmc_profile_id: curatedTrip.dmc_profile_id || null,
        dmc_user_id: paymentInfo?.dmc_user_id || null,
        dmc_partner_name: curatedTrip.dmc_partner_name || null,
        trip_title: curatedTrip.trip_title || null,
        customer_user_id: user.id,
        customer_name: user.full_name || null,
        customer_email: user.email || null,
        booking_ref_id: ref,
        lead_first_name: form.lead_first_name.trim(),
        lead_last_name: form.lead_last_name.trim(),
        lead_email: form.lead_email.trim(),
        lead_phone: form.lead_phone.trim(),
        passport_country: form.passport_country,
        adult_count: adults,
        child_count: children,
        total_travelers: totalTravelers,
        price_per_person: pricePerPerson,
        total_amount_payable: totalPayable,
        status: "payment_reported",
        receipt_url: receiptUrl,
        amount: `${currency} ${totalPayable}`,
      };

      let bookingId;
      if (existing && existing.length > 0) {
        await base44.entities.CuratedTripBooking.update(existing[0].id, bookingData);
        bookingId = existing[0].id;
      } else {
        const created = await base44.entities.CuratedTripBooking.create(bookingData);
        bookingId = created.id;
      }

      trackEvent("curated_trip_payment_reported", { curated_trip_id: curatedTrip.id, booking_ref: ref });
      posthog.capture("payment_receipt_uploaded", {
        trip_id: curatedTrip.id,
        booking_reference: ref,
        booking_value: totalPayable,
        currency,
        payment_method: selectedPaymentMethod || "unknown",
      });
      posthog.capture("booking_submitted", {
        trip_id: curatedTrip.id,
        booking_reference: ref,
        booking_status: "pending_dmc_confirmation",
      });

      // Dispatch automated emails (DMC + traveler) — best-effort
      await base44.functions
        .invoke("dispatchBookingEmails", { booking_id: bookingId, trigger: "payment_reported" })
        .catch((err) => console.error("Email dispatch failed:", err));

      setPaymentMsg({
        type: "success",
        text: `Receipt uploaded! Your booking reference is ${ref}. The operator will confirm your payment shortly.`,
      });
      // No auto-redirect — the confirmation state reveals the Travel Checklist link.
    } catch (err) {
      console.error("Payment report failed:", err);
      setPaymentMsg({ type: "error", text: err?.message || "Failed to upload receipt. Please try again." });
    } finally {
      setPaying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Render-time URL validation (XSS defense in depth) ──
  const safeHttpsUrl = (v) => {
    const s = (v || "").trim();
    if (!s) return null;
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password ? s : null;
    } catch {
      return null;
    }
  };

  const safeRevolut = safeHttpsUrl(paymentInfo?.revolut_payment_link);
  const safePaypal = safeHttpsUrl(paymentInfo?.paypal_me_link);
  const hasPaymentMethods = paymentInfo && (safeRevolut || safePaypal || paymentInfo.bank_name);

  const onPrepare = () => navigate(`/travel-checklist?trip=${tripId || ""}&path=curated`);
  const onNearby = () => {
    const dest = destination || curatedTrip?.destination || "";
    navigate(dest ? `/nearby?destination=${encodeURIComponent(dest)}` : "/nearby");
  };

  // ════════════════════════════════════════════════════════════════
  // SUCCESS STATE — shown only after a successful receipt upload
  // ════════════════════════════════════════════════════════════════
  if (bookingRef && paymentMsg?.type === "success") {
    return (
      <BookingConfirmation
        bookingRef={bookingRef}
        message={paymentMsg.text}
        onPrepare={onPrepare}
        onNearby={onNearby}
      />
    );
  }

  const inputCls = (err) =>
    `w-full rounded-xl border bg-curated-card px-3 py-2.5 text-sm text-curated-heading placeholder:text-curated-muted focus:outline-none focus:border-curated-accent ${
      err ? "border-red-500" : "border-curated-border"
    }`;

  return (
    <div className="rounded-2xl bg-curated-card border border-curated-border p-5 md:p-6 shadow-sm">
      <BookingProgress current={step} />

      {/* ════════ STEP A: Travellers ════════ */}
      {step === "A" && (
        <div>
          <h3 className="font-display text-lg font-bold text-curated-heading mb-1">Who's travelling?</h3>
          <p className="text-xs text-curated-muted mb-4">
            Select your group size ({minGroup}–{maxGroup} travellers for this trip).
          </p>

          <div className="mb-4">
            <BookingSummary trip={curatedTrip} adults={adults} children={children} totalPayable={totalPayable} />
          </div>

          {/* Adult counter */}
          <div className="flex items-center justify-between rounded-xl border border-curated-border bg-curated-surface p-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-curated-heading flex items-center gap-1.5">
                <User className="w-4 h-4 text-curated-accent" /> Adults
              </p>
              <p className="text-[11px] text-curated-muted">Age 12+</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAdults(Math.max(1, adults - 1))}
                disabled={adults <= 1}
                className="w-9 h-9 rounded-lg border border-curated-border bg-curated-card text-curated-heading hover:bg-curated-surface disabled:opacity-30 flex items-center justify-center text-lg"
              >−</button>
              <span className="w-8 text-center font-bold text-sm text-curated-heading">{adults}</span>
              <button
                type="button"
                onClick={() => setAdults(Math.min(maxGroup - children, adults + 1))}
                disabled={totalTravelers >= maxGroup}
                className="w-9 h-9 rounded-lg border border-curated-border bg-curated-card text-curated-heading hover:bg-curated-surface disabled:opacity-30 flex items-center justify-center text-lg"
              >+</button>
            </div>
          </div>

          {/* Child counter */}
          <div className="flex items-center justify-between rounded-xl border border-curated-border bg-curated-surface p-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-curated-heading flex items-center gap-1.5">
                <Users className="w-4 h-4 text-curated-accent" /> Children
              </p>
              <p className="text-[11px] text-curated-muted">Age 2–11</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setChildren(Math.max(0, children - 1))}
                disabled={children <= 0}
                className="w-9 h-9 rounded-lg border border-curated-border bg-curated-card text-curated-heading hover:bg-curated-surface disabled:opacity-30 flex items-center justify-center text-lg"
              >−</button>
              <span className="w-8 text-center font-bold text-sm text-curated-heading">{children}</span>
              <button
                type="button"
                onClick={() => setChildren(Math.min(maxGroup - adults, children + 1))}
                disabled={totalTravelers >= maxGroup}
                className="w-9 h-9 rounded-lg border border-curated-border bg-curated-card text-curated-heading hover:bg-curated-surface disabled:opacity-30 flex items-center justify-center text-lg"
              >+</button>
            </div>
          </div>

          {/* Total calculation */}
          <div className="rounded-xl bg-curated-accent/10 border border-curated-accent/30 p-4 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-curated-accent font-semibold mb-1">Trip Total</p>
            <p className="text-sm font-bold text-curated-heading">
              {currency} {pricePerPerson} × {totalTravelers} traveller{totalTravelers !== 1 ? "s" : ""} = {currency} {totalPayable}
            </p>
          </div>

          {totalTravelers < minGroup && (
            <p className="text-[11px] mb-3" style={{ color: "#B45309" }}>
              Minimum group size for this trip is {minGroup}.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              posthog.capture("group_size_completed", { trip_id: curatedTrip?.id, group_size: totalTravelers });
              setStep("B");
            }}
            disabled={!canProceedA}
            className="w-full py-3.5 rounded-full bg-curated-accent text-curated-accent-fg text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-curated-muted text-center mt-2.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Operated by {curatedTrip?.dmc_partner_name || "a local travel partner"}
          </p>
        </div>
      )}

      {/* ════════ STEP B: Your Details ════════ */}
      {step === "B" && (
        <div>
          <h3 className="font-display text-lg font-bold text-curated-heading mb-1">Your details</h3>
          <p className="text-xs text-curated-muted mb-4">
            Where should the local operator send your booking information?
          </p>

          <div className="mb-4">
            <BookingSummary trip={curatedTrip} adults={adults} children={children} totalPayable={totalPayable} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-semibold text-curated-muted block mb-1">First Name *</label>
              <input
                type="text"
                value={form.lead_first_name}
                onChange={(e) => setForm({ ...form, lead_first_name: e.target.value })}
                className={inputCls(formErrors.lead_first_name)}
                placeholder="John"
              />
              {formErrors.lead_first_name && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.lead_first_name}</p>}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-curated-muted block mb-1">Last Name *</label>
              <input
                type="text"
                value={form.lead_last_name}
                onChange={(e) => setForm({ ...form, lead_last_name: e.target.value })}
                className={inputCls(formErrors.lead_last_name)}
                placeholder="Doe"
              />
              {formErrors.lead_last_name && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.lead_last_name}</p>}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[11px] font-semibold text-curated-muted block mb-1">Email *</label>
            <input
              type="email"
              value={form.lead_email}
              onChange={(e) => setForm({ ...form, lead_email: e.target.value })}
              className={inputCls(formErrors.lead_email)}
              placeholder="john@example.com"
            />
            {formErrors.lead_email && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.lead_email}</p>}
          </div>

          <div className="mb-3">
            <label className="text-[11px] font-semibold text-curated-muted block mb-1">Phone (with country code) *</label>
            <input
              type="tel"
              value={form.lead_phone}
              onChange={(e) => setForm({ ...form, lead_phone: e.target.value })}
              className={inputCls(formErrors.lead_phone)}
              placeholder="+44 7700 900123"
            />
            {formErrors.lead_phone && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.lead_phone}</p>}
          </div>

          <div className="mb-3">
            <label className="text-[11px] font-semibold text-curated-muted block mb-1">Passport Country / Nationality *</label>
            <Select
              value={form.passport_country}
              onValueChange={(val) => setForm({ ...form, passport_country: val })}
            >
              <SelectTrigger className={inputCls(formErrors.passport_country)}>
                <SelectValue placeholder="Select country…" />
              </SelectTrigger>
              <SelectContent className="max-h-64 bg-curated-card border-curated-border text-curated-heading shadow-2xl z-50">
                {COUNTRIES.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="bg-curated-card text-curated-heading focus:bg-curated-accent focus:text-curated-accent-fg cursor-pointer"
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.passport_country && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.passport_country}</p>}
          </div>

          {/* Concise privacy notice */}
          <div className="flex items-start gap-2 rounded-xl bg-curated-surface border border-curated-border p-3 mb-4">
            <ShieldCheck className="w-4 h-4 text-curated-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-curated-muted leading-relaxed">
              Your details are securely logged by DheeVoy and shared only with the operator managing this trip.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("A")}
              className="flex-1 py-3.5 rounded-full border border-curated-border text-curated-heading text-sm font-semibold hover:bg-curated-surface transition flex items-center justify-center gap-1.5 min-h-[48px]"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (validateB()) {
                  posthog.capture("traveller_details_completed");
                  setStep("C");
                }
              }}
              className="flex-[2] py-3.5 rounded-full bg-curated-accent text-curated-accent-fg text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 min-h-[48px]"
            >
              Continue to Payment <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════ STEP C: Payment & Confirmation ════════ */}
      {step === "C" && (
        <div>
          <h3 className="font-display text-lg font-bold text-curated-heading mb-1 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-curated-accent" /> Payment &amp; Confirmation
          </h3>
          <p className="text-xs text-curated-muted mb-4">
            Payment and booking for this trip are handled directly by{" "}
            <strong className="text-curated-heading">
              {paymentInfo?.business_name || curatedTrip?.dmc_partner_name || "the operator"}
            </strong>
            .
          </p>

          <div className="mb-4">
            <BookingSummary trip={curatedTrip} adults={adults} children={children} totalPayable={totalPayable} />
          </div>

          {/* Total payable */}
          <div className="rounded-xl bg-curated-accent/10 border border-curated-accent/30 p-4 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-curated-accent font-semibold">Total to Pay</p>
            <p className="text-2xl font-bold text-curated-heading">{currency} {totalPayable}</p>
            <p className="text-[11px] text-curated-muted">
              {adults} adult{adults !== 1 ? "s" : ""}
              {children > 0 ? ` + ${children} child${children !== 1 ? "ren" : ""}` : ""} × {currency} {pricePerPerson}/person
            </p>
          </div>

          {hasPaymentMethods ? (
            <>
              {/* DMC payment links */}
              <div className="flex flex-wrap gap-2 mb-3">
                {safeRevolut && (
                  <a
                    href={safeRevolut}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setSelectedPaymentMethod("revolut");
                      posthog.capture("payment_method_selected", { payment_method: "revolut" });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-curated-surface text-curated-heading border border-curated-border text-xs font-semibold hover:border-curated-accent transition-colors min-h-[44px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Pay with Revolut
                  </a>
                )}
                {safePaypal && (
                  <a
                    href={safePaypal}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setSelectedPaymentMethod("paypal");
                      posthog.capture("payment_method_selected", { payment_method: "paypal" });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-curated-surface text-curated-heading border border-curated-border text-xs font-semibold hover:border-curated-accent transition-colors min-h-[44px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Pay with PayPal
                  </a>
                )}
              </div>

              {/* Bank transfer details */}
              {paymentInfo.bank_name && (
                <div
                  onClick={() => {
                    setSelectedPaymentMethod("bank_transfer");
                    posthog.capture("payment_method_selected", { payment_method: "bank_transfer" });
                  }}
                  className="rounded-xl bg-curated-surface border border-curated-border p-4 text-xs mb-4"
                >
                  <p className="font-semibold text-curated-heading mb-2">Bank Transfer</p>
                  <CopyField label="Bank" value={paymentInfo.bank_name} />
                  <CopyField label="Account" value={paymentInfo.account_number} />
                  <CopyField label="SWIFT/IFSC" value={paymentInfo.swift_ifsc} />
                  <CopyField label="UPI" value={paymentInfo.upi_id} />
                </div>
              )}

              {/* Receipt upload */}
              <input type="file" accept="image/*,application/pdf" ref={fileInputRef} className="hidden" onChange={handleUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={paying}
                className="w-full py-3.5 rounded-full bg-curated-accent text-curated-accent-fg text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mb-2 min-h-[48px]"
              >
                {paying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" /> I've Paid — Upload Receipt</>
                )}
              </button>
              {paymentMsg && (
                <p className={`text-xs mb-2 ${paymentMsg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {paymentMsg.text}
                </p>
              )}
            </>
          ) : (
            <div
              className="rounded-xl border p-3 text-xs mb-3"
              style={{ background: "#FEF3C7", borderColor: "#FCD34D", color: "#92400E" }}
            >
              Direct payment details for this operator will be available shortly. You can still proceed and explore nearby attractions.
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep("B")}
            className="w-full py-2 text-xs text-curated-muted hover:text-curated-heading transition flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Your Details
          </button>
        </div>
      )}
    </div>
  );
}