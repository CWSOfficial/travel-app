import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet, ExternalLink, Upload, Loader2, MapPin, ArrowRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";

// Reusable Payment & Confirmation step for a curated trip.
// Shown on the Confirmation page after a user clicks "Select This Trip".
// Lets the customer pay the operator directly (PayPal / Revolut / bank) and
// upload a receipt, or skip straight to Nearby Attractions with trip context.
// After a successful receipt upload (or skip) the user is routed to /nearby
// with the trip destination pre-attached.
export default function CuratedPaymentStep({ curatedTrip, destination, showSkipToNearby = true }) {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState(null);
  const fileInputRef = useRef(null);

  // DMC direct-payment info — fetched server-side so the customer never needs
  // read access to the DMC's private profile. Requires a logged-in user.
  const { data: paymentInfo } = useQuery({
    queryKey: ["dmc_payment_info", curatedTrip?.id],
    queryFn: async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!u) return null;
      const res = await base44.functions.invoke("getDmcPaymentInfo", { curated_trip_id: curatedTrip.id });
      return res.data?.payment_info || null;
    },
    enabled: !!curatedTrip?.id,
  });

  const goToNearby = () => {
    const dest = destination || curatedTrip?.destination || "";
    trackEvent("curated_trip_goto_nearby", { destination: dest });
    navigate(dest ? `/nearby?destination=${encodeURIComponent(dest)}` : "/nearby");
  };

  const handleIHavePaid = async (e) => {
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
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const receiptUrl = uploadRes?.file_url;
      if (!receiptUrl) throw new Error("Upload failed");
      // Re-use an existing booking for this customer+trip if present, else create
      const existing = await base44.entities.CuratedTripBooking.filter({
        curated_trip_id: curatedTrip.id,
        customer_user_id: user.id,
      });
      if (existing && existing.length > 0) {
        await base44.entities.CuratedTripBooking.update(existing[0].id, {
          status: "payment_reported",
          receipt_url: receiptUrl,
        });
      } else {
        await base44.entities.CuratedTripBooking.create({
          curated_trip_id: curatedTrip.id,
          dmc_profile_id: curatedTrip.dmc_profile_id || null,
          dmc_user_id: paymentInfo?.dmc_user_id || null,
          dmc_partner_name: curatedTrip.dmc_partner_name || null,
          trip_title: curatedTrip.trip_title || null,
          customer_user_id: user.id,
          customer_name: user.full_name || null,
          customer_email: user.email || null,
          status: "payment_reported",
          receipt_url: receiptUrl,
          amount: curatedTrip.price_display || null,
        });
      }
      setPaymentMsg({ type: "success", text: "Receipt uploaded — the operator will confirm your payment shortly." });
      trackEvent("curated_trip_payment_reported", { curated_trip_id: curatedTrip.id });
      // Redirect to Nearby with trip context after a short pause for the success message
      setTimeout(() => goToNearby(), 1200);
    } catch (err) {
      console.error("Payment report failed:", err);
      setPaymentMsg({ type: "error", text: err?.message || "Failed to upload receipt. Please try again." });
    } finally {
      setPaying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Render-time URL validation (XSS defense in depth) ──
  // Never trust that a stored payment link is safe, even though the DMC form
  // and getDmcPaymentInfo backend already validate. A javascript:/data: URL
  // rendered as href would execute in the customer's browser and could steal
  // their auth token from localStorage. Only a strict https:// URL is ever
  // rendered as a clickable link; anything else is treated as absent.
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
  const hasPaymentMethods =
    paymentInfo && (safeRevolut || safePaypal || paymentInfo.bank_name);

  return (
    <div className="rounded-2xl bg-white border-2 border-primary/30 p-5 mb-6 shadow-sm">
      <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
        <Wallet className="w-4 h-4 text-emerald-500" /> Payment &amp; Confirmation
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Pay {paymentInfo?.business_name || curatedTrip?.dmc_partner_name || "the operator"} directly,
        then upload your receipt to confirm your spot.
      </p>

      {hasPaymentMethods ? (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {safeRevolut && (
              <a
                href={safeRevolut}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Pay with Revolut
              </a>
            )}
            {safePaypal && (
              <a
                href={safePaypal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Pay with PayPal
              </a>
            )}
          </div>

          {paymentInfo.bank_name && (
            <div className="rounded-xl bg-slate-50 border border-border p-3 text-xs space-y-1 mb-3">
              <p className="font-semibold text-foreground mb-1">Bank Transfer</p>
              <p><span className="text-muted-foreground">Bank:</span> {paymentInfo.bank_name}</p>
              {paymentInfo.account_number && (
                <p><span className="text-muted-foreground">Account:</span> {paymentInfo.account_number}</p>
              )}
              {paymentInfo.swift_ifsc && (
                <p><span className="text-muted-foreground">SWIFT/IFSC:</span> {paymentInfo.swift_ifsc}</p>
              )}
              {paymentInfo.upi_id && (
                <p><span className="text-muted-foreground">UPI:</span> {paymentInfo.upi_id}</p>
              )}
            </div>
          )}

          <input type="file" accept="image/*,application/pdf" ref={fileInputRef} className="hidden" onChange={handleIHavePaid} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={paying}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-2 min-h-[44px]"
          >
            {paying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4" /> I Have Paid — Upload Receipt</>
            )}
          </button>
          {paymentMsg && (
            <p className={`text-xs mb-2 ${paymentMsg.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
              {paymentMsg.text}
            </p>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 mb-3">
          Direct payment details for this operator will be available shortly. You can still proceed and explore nearby attractions.
        </div>
      )}

      {/* Skip to Nearby Attractions — always available so users are never trapped.
          Hidden on Page 2 (CuratedTripBooking) where the closing banner provides
          its own Nearby Attractions link as a secondary action. */}
      {showSkipToNearby && (
        <button
          onClick={goToNearby}
          className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-black/80 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <MapPin className="w-4 h-4" /> Skip to Nearby Attractions <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}