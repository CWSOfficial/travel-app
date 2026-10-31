import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Save, Check } from "lucide-react";
import { jsPDF } from "jspdf";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import SaveTripPlanModal from "./SaveTripPlanModal";

export default function ExportShareBar({ destination, preferences, itinerary, tripId, onSave, isSaving, pendingAction, onPendingDone }) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [guestAction, setGuestAction] = useState(null);

  // ── Guest guard: shows lead-capture modal instead of executing ──
  // Test override: ?test_guest=1 simulates guest mode for authenticated testers
  const simulateGuest = new URLSearchParams(window.location.search).get("test_guest") === "1";
  const isGuest = !isAuthenticated || simulateGuest;
  const guard = (actionType, handler) => {
    if (isGuest) {
      setGuestAction(actionType);
      setShowModal(true);
      trackEvent("guest_lead_capture_shown", { action: actionType });
    } else {
      handler();
    }
  };

  // ── Pending action: auto-complete after sign-in redirect ──
  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction === "export") doExportPDF();
    else if (pendingAction === "share") doShare();
    else if (pendingAction === "save") doSave();
    onPendingDone();
  }, [pendingAction]);

  const doExportPDF = () => {
    setExporting(true);
    trackEvent("dashboard_export_pdf", { destination: destination?.name });
    try {
      const doc = new jsPDF();
      const dest = destination?.name || "Trip";
      let y = 20;

      doc.setFontSize(20);
      doc.text(`DheeVoy Trip Plan`, 105, y, { align: "center" });
      y += 10;
      doc.setFontSize(14);
      doc.text(dest, 105, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(120);
      const meta = `${preferences?.duration_days || 0} days · ${preferences?.departure_city || "—"} · ${preferences?.budget?.replace("_", " ") || ""} · ${preferences?.travel_style || ""}`;
      doc.text(meta, 105, y, { align: "center" });
      y += 10;

      if (destination?.visa_requirement) {
        doc.setTextColor(0, 150, 80);
        doc.text(`Visa: ${destination.visa_requirement}`, 20, y);
        y += 6;
      }
      if (destination?.safety_index_score != null) {
        doc.setTextColor(0, 120, 200);
        doc.text(`Safety Score: ${destination.safety_index_score}/100`, 20, y);
        y += 8;
      }

      doc.setTextColor(40);
      doc.setDrawColor(200);
      doc.line(20, y, 190, y);
      y += 8;

      (itinerary || []).forEach((day, idx) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setTextColor(20);
        doc.text(`Day ${idx + 1}: ${day.theme || ""}`, 20, y);
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(100);
        ["morning", "afternoon", "evening"].forEach((slot) => {
          const act = (day[slot] || [])[0];
          if (act) {
            doc.text(`  ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${act.title} — ${act.description}`, 20, y);
            y += 5;
          }
        });
        if (day.accommodation) { doc.text(`  Stay: ${day.accommodation}`, 20, y); y += 5; }
        if (day.tips) { doc.text(`  Tip: ${day.tips}`, 20, y); y += 5; }
        y += 4;
      });

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("AI-generated guidance. Always verify visa & safety with official embassy sources.", 105, 285, { align: "center" });

      doc.save(`DheeVoy-${dest.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
    } catch (e) {
      // non-blocking
    }
    setExporting(false);
  };

  const doShare = async () => {
    trackEvent("dashboard_share", { destination: destination?.name, hasTripId: !!tripId });
    const summary = `My DheeVoy trip plan: ${destination?.name} (${preferences?.duration_days} days from ${preferences?.departure_city})`;
    const shareUrl = tripId ? `${window.location.origin}/trip-dashboard?trip=${tripId}` : window.location.href;
    const fullText = `${summary} — ${shareUrl}`;

    const copyToClipboard = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      toast({ title: "Link copied to clipboard!", description: "Share your trip plan with friends." });
    };

    try {
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        try {
          await navigator.share({ title: "My DheeVoy Trip", text: summary, url: shareUrl });
        } catch (shareErr) {
          if (shareErr?.name !== "AbortError") await copyToClipboard();
        }
      } else {
        await copyToClipboard();
      }
    } catch {
      // non-blocking
    }
  };

  const doSave = async () => {
    if (!onSave) return;
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Guarded handlers (guest → modal, authed → execute) ──
  const handleExportPDF = () => guard("export", doExportPDF);
  const handleShare = () => guard("share", doShare);
  const handleSave = () => guard("save", doSave);

  // ── Continue as Guest: execute once without signing in ──
  const handleContinueAsGuest = () => {
    if (guestAction === "export") doExportPDF();
    else if (guestAction === "share") doShare();
    else if (guestAction === "save") {
      // Guest can't save to profile — acknowledge local persistence
      toast({ title: "Trip saved locally", description: "Sign up to sync your trip to your profile." });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExportPDF} variant="outline" className="rounded-xl gap-2 h-11" disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export PDF
        </Button>
        <Button onClick={handleShare} variant="outline" className="rounded-xl gap-2 h-11">
          {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          {shared ? "Copied!" : "Share"}
        </Button>
        {onSave && (
          <Button onClick={handleSave} className="rounded-xl gap-2 h-11" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : tripId ? "Update Trip" : "Save Trip"}
          </Button>
        )}
      </div>

      <SaveTripPlanModal
        open={showModal}
        onClose={() => setShowModal(false)}
        actionType={guestAction}
        onContinueAsGuest={handleContinueAsGuest}
      />
    </>
  );
}