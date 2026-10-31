import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import { CheckCircle, Clock, Loader2, ExternalLink, Building2, ArrowLeft, Hash, Globe, Users, Wallet, Mail, Phone, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function DMCDashboard() {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [msg, setMsg] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // RLS restricts to bookings where dmc_user_id == current user.id
      const list = await base44.entities.CuratedTripBooking.filter({ status: "payment_reported" }, "-created_date", 50);
      setBookings(Array.isArray(list) ? list : []);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadBookings();
    else setLoading(false);
  }, [isAuthenticated]);

  const confirmFunds = async (booking) => {
    setConfirming(booking.id);
    setMsg(null);
    try {
      // 1. Update booking status to confirmed
      await base44.entities.CuratedTripBooking.update(booking.id, { status: "confirmed" });
      posthog.capture("dmc_booking_confirmed", {
        trip_id: booking.curated_trip_id,
        booking_reference: booking.booking_ref_id,
        booking_value: booking.total_amount_payable,
        currency: booking.currency,
        booking_status: "confirmed",
      });
      // 2. Send confirmation email to traveler
      await base44.functions.invoke("dispatchBookingEmails", { booking_id: booking.id, trigger: "confirmed" });
      posthog.capture("booking_confirmation_sent");
      // 3. Alert DheeVoy admin(s) — email + in-app notification (existing flow)
      await base44.functions.invoke("alertDmcPaymentConfirmed", { booking_id: booking.id });
      setMsg({ type: "success", text: `Confirmed funds for "${booking.trip_title || "trip"}". Traveler notified, DheeVoy admin alerted.` });
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to confirm. Please try again." });
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dmc" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">📋 DMC Bookings Dashboard</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Travellers who reported payment for your trips. Confirm funds received to notify the traveler and alert the DheeVoy admin.</p>
        </div>

        {msg && <p className={`text-xs mb-4 ${msg.type === "success" ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-700 border-t-teal-400 rounded-full animate-spin" /></div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <CheckCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No pending payment reports. New "Payment Reported" bookings will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                {/* Header: trip title + status badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{b.trip_title || "Curated Trip"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {b.dmc_partner_name || "—"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-amber-500/15 border-amber-400/30 text-amber-300 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> Payment Reported
                  </span>
                </div>

                {/* Booking Reference ID */}
                {b.booking_ref_id && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs">
                    <Hash className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-slate-500">Booking Ref:</span>
                    <span className="font-bold text-teal-300 tracking-wider">{b.booking_ref_id}</span>
                  </div>
                )}

                {/* Expanded details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-3">
                  {/* Lead Traveler Name */}
                  <p className="flex items-center gap-1.5">
                    <span className="text-slate-500">Lead:</span>
                    <span className="font-medium text-white">
                      {[b.lead_first_name, b.lead_last_name].filter(Boolean).join(" ") || b.customer_name || "—"}
                    </span>
                  </p>
                  {/* Passport Country */}
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500">Passport:</span>
                    <span>{b.passport_country || "—"}</span>
                  </p>
                  {/* Group Size */}
                  <p className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500">Group:</span>
                    <span>{b.adult_count || 0} Adults, {b.child_count || 0} Children</span>
                  </p>
                  {/* Total Amount Paid */}
                  <p className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500">Total:</span>
                    <span className="font-semibold text-emerald-300">
                      {b.total_amount_payable != null ? `${b.currency || "USD"} ${b.total_amount_payable}` : (b.amount || "—")}
                    </span>
                  </p>
                </div>

                {/* Contact info */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-300 mb-3">
                  {b.lead_email && (
                    <a href={`mailto:${b.lead_email}`} className="flex items-center gap-1.5 text-teal-300 hover:text-teal-200">
                      <Mail className="w-3.5 h-3.5" /> {b.lead_email}
                    </a>
                  )}
                  {b.lead_phone && (
                    <a href={`tel:${b.lead_phone}`} className="flex items-center gap-1.5 text-teal-300 hover:text-teal-200">
                      <Phone className="w-3.5 h-3.5" /> {b.lead_phone}
                    </a>
                  )}
                </div>

                {/* Receipt preview image */}
                {b.receipt_url && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Receipt
                    </p>
                    <a href={b.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                      <img
                        src={b.receipt_url}
                        alt="Payment receipt"
                        className="h-24 rounded-lg border border-white/10 object-cover group-hover:border-teal-400/40 transition-colors"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <span className="block text-[10px] text-teal-300 mt-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View full receipt
                      </span>
                    </a>
                  </div>
                )}

                {/* Confirm button */}
                <button
                  onClick={() => confirmFunds(b)}
                  disabled={confirming === b.id}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {confirming === b.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming…</>
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5" /> Confirm Funds Received</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}