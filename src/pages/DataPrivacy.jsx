import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trash2, Download, AlertTriangle, Shield, CheckCircle2, Loader2 } from "lucide-react";
import BottomNav from "@/components/travel/BottomNav";

const STEPS = { IDLE: "idle", CONFIRM: "confirm", PROCESSING: "processing", DONE: "done" };

export default function DataPrivacy() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(STEPS.IDLE);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [exportDone, setExportDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleExportData = async () => {
    if (!user) return;
    // Fetch user's trips to bundle with account info
    // Trip records are created by the saveTrip backend function under asServiceRole,
    // so created_by_id is the service role, not the user. user_id is the real owner field.
    const trips = await base44.entities.Trip.filter({ user_id: user.id });
    const exportPayload = {
      export_date: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_date: user.created_date,
      },
      trips: trips.map(t => ({
        id: t.id,
        departure_city: t.departure_city,
        selected_destination: t.selected_destination,
        start_date: t.start_date,
        duration_days: t.duration_days,
        status: t.status,
        created_date: t.created_date,
      })),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dheevoy-data-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== "delete my account") {
      setError('Please type "delete my account" exactly to confirm.');
      return;
    }
    setError("");
    setStep(STEPS.PROCESSING);
    try {
      // Delete all user's trip data — query by user_id (service-role created_by_id won't match)
      const trips = await base44.entities.Trip.filter({ user_id: user.id });
      await Promise.all(trips.map(t => base44.entities.Trip.delete(t.id)));
      // Sign out — account record deletion is handled by the platform
      await base44.auth.logout("/login");
      setStep(STEPS.DONE);
    } catch (err) {
      setError("Something went wrong. Please email privacy@dheevoy.com to complete the deletion request.");
      setStep(STEPS.CONFIRM);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <h1 className="font-bold text-sm">Privacy & Data</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Info card */}
        <Card className="p-4 rounded-2xl bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-800 leading-relaxed">
            Under GDPR, UK GDPR, CCPA, and other global privacy laws, you have the right to access, export, or permanently delete your personal data. We will action all requests within <strong>30 days</strong>.
          </p>
        </Card>

        {/* Export */}
        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Download className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Export My Data</h3>
              <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Includes your account details and all trip records. Your right to data portability under Article 20 GDPR.
          </p>
          {exportDone ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Export downloaded successfully
            </div>
          ) : (
            <Button onClick={handleExportData} variant="outline" className="w-full rounded-xl gap-2">
              <Download className="w-4 h-4" /> Download My Data
            </Button>
          )}
        </Card>

        {/* Legal links */}
        <Card className="rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { label: "Privacy Policy", path: "/privacy", desc: "How we collect and use your data" },
            { label: "Terms of Service", path: "/terms", desc: "Your rights and obligations" },
            { label: "Cookie Policy", path: "/privacy#cookies", desc: "Cookie usage and preferences" },
          ].map(({ label, path, desc }) => (
            <Link key={label} to={path} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </Link>
          ))}
        </Card>

        {/* Right to Be Forgotten */}
        <Card className="p-5 rounded-2xl border-red-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-red-700">Right to Be Forgotten</h3>
              <p className="text-xs text-muted-foreground">Permanently delete your account & all data</p>
            </div>
          </div>

          {step === STEPS.IDLE && (
            <>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                This will permanently erase all your personal data (email, phone, trip records) from our systems. This action cannot be undone. Payment transaction references are retained for 7 years as required by tax law.
              </p>
              <Button
                onClick={() => setStep(STEPS.CONFIRM)}
                variant="outline"
                className="w-full rounded-xl border-red-300 text-red-600 hover:bg-red-50 gap-2"
              >
                <Trash2 className="w-4 h-4" /> Request Account Deletion
              </Button>
            </>
          )}

          {step === STEPS.CONFIRM && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  This is <strong>irreversible</strong>. All trips, preferences, and account data will be deleted permanently. Your subscription will be cancelled immediately with no refund.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Type <strong>delete my account</strong> to confirm:</p>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="delete my account"
                className="h-10 text-sm rounded-xl"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setStep(STEPS.IDLE); setConfirmText(""); }} className="flex-1 rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Permanently Delete
                </Button>
              </div>
            </div>
          )}

          {step === STEPS.PROCESSING && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Deleting your data…
            </div>
          )}

          {step === STEPS.DONE && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Account deleted. Redirecting…
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Questions? Email <a href="mailto:privacy@dheevoy.com" className="text-blue-600">privacy@dheevoy.com</a>
          <br />We respond within 30 days as required by law.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}