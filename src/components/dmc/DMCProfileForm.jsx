import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, Building2 } from "lucide-react";

/**
 * DMC Partner Profile form — business + banking details stored once.
 * Loads the current user's existing profile (if any) and lets them create/update it.
 * On save, calls onSave(profile) so the parent can refresh its state.
 */
export default function DMCProfileForm({ existing, onSave }) {
  const [form, setForm] = useState(
    existing || {
      business_name: "",
      contact_name: "",
      email: "",
      phone: "",
      country_region: "",
      bank_name: "",
      account_number: "",
      swift_ifsc: "",
      upi_id: "",
      revolut_payment_link: "",
      paypal_me_link: "",
      emergency_contact: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existing) setForm({ ...form, ...existing });
  }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Payment-link validation (XSS prevention) ──
  // DMC payment links are later rendered as href on <a> tags in the customer
  // checkout, so a javascript:/data: URL would execute in a customer's browser
  // and could steal their auth token. Only https:// URLs on the expected
  // payment-provider domains are accepted. Empty is allowed (optional fields).
  const ALLOWED_PAYMENT_DOMAINS = {
    revolut_payment_link: ["revolut.me"],
    paypal_me_link: ["paypal.me", "paypal.com"],
  };

  function isValidPaymentUrl(value, field) {
    const v = (value || "").trim();
    if (!v) return true; // optional field — empty is valid
    if (!/^https:\/\//i.test(v)) return false; // must start with https://
    try {
      const u = new URL(v);
      if (u.protocol !== "https:" || u.username || u.password) return false;
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      const allowed = ALLOWED_PAYMENT_DOMAINS[field] || [];
      return allowed.some((d) => host === d || host.endsWith("." + d));
    } catch {
      return false;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate payment links before saving — reject javascript:/data:/non-https
    // and non-allowlisted domains. This is the primary XSS guard; the backend
    // (getDmcPaymentInfo) re-validates at render time as defense in depth.
    const revolutOk = isValidPaymentUrl(form.revolut_payment_link, "revolut_payment_link");
    const paypalOk = isValidPaymentUrl(form.paypal_me_link, "paypal_me_link");
    if (!revolutOk || !paypalOk) {
      const bad = [];
      if (!revolutOk) bad.push("Revolut link");
      if (!paypalOk) bad.push("PayPal link");
      setError(
        `${bad.join(" and ")} must be a valid https:// URL on the expected domain ` +
        `(e.g. https://revolut.me/your-handle or https://paypal.me/your-handle). ` +
        `Other schemes (javascript:, data:) are not allowed.`
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved;
      if (form.id) {
        saved = await base44.entities.DMCProfile.update(form.id, form);
      } else {
        saved = await base44.entities.DMCProfile.create(form);
      }
      onSave?.(saved);
    } catch (err) {
      setError(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 transition-all";
  const labelCls = "text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-teal-400" />
        <h3 className="text-lg font-bold text-white">DMC Partner Profile</h3>
        {existing?.verification_status === "verified" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 -mt-3">
        Save your business & banking details once. You won't need to re-enter these for each trip submission.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>🏢 Business Name *</label>
          <input className={fieldCls} value={form.business_name} onChange={(e) => set("business_name", e.target.value)} required placeholder="e.g. Wanderlust Tours Pvt Ltd" />
        </div>
        <div>
          <label className={labelCls}>👤 Contact Name *</label>
          <input className={fieldCls} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} required placeholder="Full name" />
        </div>
        <div>
          <label className={labelCls}>✉️ Email *</label>
          <input type="email" className={fieldCls} value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="contact@business.com" />
        </div>
        <div>
          <label className={labelCls}>📱 Phone *</label>
          <input className={fieldCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="+44 7700 900123" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>🌍 Country / Region *</label>
          <input className={fieldCls} value={form.country_region} onChange={(e) => set("country_region", e.target.value)} required placeholder="e.g. India, United Kingdom" />
        </div>
      </div>

      <div className="pt-2">
        <p className="text-xs font-semibold text-slate-300 mb-3">🏦 Banking & Payment Links (optional now, required before publishing)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Bank Name</label>
            <input className={fieldCls} value={form.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} placeholder="e.g. HDFC Bank" />
          </div>
          <div>
            <label className={labelCls}>Account Number</label>
            <input className={fieldCls} value={form.account_number || ""} onChange={(e) => set("account_number", e.target.value)} placeholder="Bank account number" />
          </div>
          <div>
            <label className={labelCls}>SWIFT / IFSC Code</label>
            <input className={fieldCls} value={form.swift_ifsc || ""} onChange={(e) => set("swift_ifsc", e.target.value)} placeholder="SWIFT (intl) or IFSC (India)" />
          </div>
          <div>
            <label className={labelCls}>UPI ID</label>
            <input className={fieldCls} value={form.upi_id || ""} onChange={(e) => set("upi_id", e.target.value)} placeholder="name@upi (optional)" />
          </div>
          <div>
            <label className={labelCls}>Revolut Payment Link</label>
            <input className={fieldCls} value={form.revolut_payment_link || ""} onChange={(e) => set("revolut_payment_link", e.target.value)} placeholder="https://revolut.me/your-handle" />
          </div>
          <div>
            <label className={labelCls}>PayPal.me Link</label>
            <input className={fieldCls} value={form.paypal_me_link || ""} onChange={(e) => set("paypal_me_link", e.target.value)} placeholder="https://paypal.me/your-handle" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>🚨 Emergency Contact</label>
            <input className={fieldCls} value={form.emergency_contact || ""} onChange={(e) => set("emergency_contact", e.target.value)} placeholder="Name + phone for emergencies" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/30 text-red-300 rounded-xl px-4 py-2.5 text-xs">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(20,184,166,0.3)] hover:shadow-[0_0_35px_rgba(20,184,166,0.5)] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save DMC Profile"}
      </button>
    </form>
  );
}