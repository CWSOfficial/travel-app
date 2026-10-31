import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Plane, Hotel, Bell, ShieldCheck, ClipboardList, Save, ArrowRight } from "lucide-react";

const DOC_CHECKLIST = [
  { icon: "🛂", item: "Valid passport (must be 6+ months validity)" },
  { icon: "📋", item: "Visa requirements checked for your destination" },
  { icon: "🏥", item: "Travel insurance arranged" },
  { icon: "💊", item: "Required vaccinations / health requirements" },
  { icon: "💳", item: "Notify your bank of travel dates" },
  { icon: "📱", item: "Download airline & hotel apps" },
  { icon: "📞", item: "Save local emergency contacts & embassy number" },
  { icon: "🔒", item: "Backup copies of all travel documents" },
];

const NOTIFICATIONS = [
  "✈️ Flight reminders (72h, 24h, 12h, 3h before)",
  "🏨 Hotel check-in reminder (1 day & 4h before)",
  "🛂 Check-in alert (2h domestic / 3h international)",
  "📋 Visa/passport reminder (30 & 14 days before)",
  "⛅ Real-time weather & flight delay alerts",
  "🔁 Return flight reminder (24h before)",
  "📝 Post-travel feedback (after return)",
];

export default function ConfirmationScreen({ destination, preferences, onSave, isSaving, onStartOver, tripId }) {
  const navigate = useNavigate();
  const [flightRef, setFlightRef] = useState("");
  const [hotelRef, setHotelRef] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-10"
    >
      {/* Header — peak-end rule: make the success moment feel earned */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="font-black text-3xl">You're All Set! ✈️</h2>
        <p className="text-slate-600 mt-2 text-sm max-w-sm mx-auto leading-relaxed">
          Your trip to <span className="font-semibold text-foreground">{destination?.name}</span> is saved. We'll send smart travel alerts as your departure approaches.
        </p>
      </div>

      {/* Booking summary */}
      <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4" /> Booking Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { label: "Destination", value: destination?.name },
            { label: "Start Date", value: preferences?.start_date },
            { label: "Duration", value: `${preferences?.duration_days} days` },
            { label: "Travellers", value: `${preferences?.num_travelers || 1} person(s)` },
            { label: "From", value: preferences?.departure_city },
            { label: "Budget", value: preferences?.budget?.replace("_", " ") },
            { label: "Style", value: preferences?.travel_style },
            { label: "Est. Total", value: destination?.total_cost },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-muted rounded-xl">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold text-sm mt-0.5 capitalize">{value || "—"}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4" /> Automated Travel Alerts
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Sending to: <span className="font-semibold text-foreground">{preferences?.email}</span>
          {preferences?.phone && <> · {preferences.phone}</>}
        </p>
        <div className="space-y-2">
          {NOTIFICATIONS.map((n, i) => (
            <p key={i} className="text-xs text-muted-foreground">{n}</p>
          ))}
        </div>
      </Card>

      {/* Booking refs */}
      <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
          <Plane className="w-4 h-4" /> Booking Reference Numbers
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Enter your reference numbers after booking on Expedia, Hotels.com or Aviasales.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Plane className="w-3 h-3" /> Flight Ref</Label>
            <Input placeholder="e.g. SKY-AB12345" value={flightRef} onChange={e => setFlightRef(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Hotel className="w-3 h-3" /> Hotel Ref</Label>
            <Input placeholder="e.g. BKG-XY98765" value={hotelRef} onChange={e => setHotelRef(e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card className="p-5 border-border shadow-sm mb-8 rounded-2xl">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4" /> Travel Documents Checklist
        </h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {DOC_CHECKLIST.map(({ icon, item }, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="flex-shrink-0">{icon}</span>
              <p className="text-xs text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" onClick={() => onSave({ flight_booking_ref: flightRef, hotel_booking_ref: hotelRef })} disabled={isSaving} className="rounded-full gap-2 bg-black hover:bg-black/80 text-white px-8">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Reference Numbers"}
        </Button>
        <Button size="lg" variant="outline" onClick={onStartOver} className="rounded-full gap-2 px-8">
          Plan Another Trip ✈️
        </Button>
      </div>

      {/* Continue to Travel Checklist — entry point added for the restructured flow */}
      {tripId && (
        <div className="text-center mt-4">
          <button
            onClick={() => navigate(`/travel-checklist?trip=${tripId}&path=self_planned`)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ClipboardList className="w-4 h-4" /> Continue to Travel Checklist <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}