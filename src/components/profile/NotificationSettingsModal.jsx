import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Bell, Mail, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const TEAL = "#00E5CC";

export default function NotificationSettingsModal({ user, onClose }) {
  const [emailEnabled, setEmailEnabled] = useState(user?.notification_email_enabled !== false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = async () => {
    const newValue = !emailEnabled;
    setEmailEnabled(newValue);
    setSaving(true);
    setSaved(false);
    try {
      await base44.auth.updateMe({ notification_email_enabled: newValue });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Revert on failure
      setEmailEnabled(!newValue);
    } finally {
      setSaving(false);
    }
  };

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
        {/* Header */}
        <div className="relative px-6 pt-8 pb-4 text-center">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-slate-100">
            <Bell className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="font-black text-xl">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage how you receive trip alerts</p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Alert summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Alerts</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-border">
                  <Mail className="w-4 h-4" style={{ color: TEAL }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Email Trip Alerts</p>
                  <p className="text-xs text-muted-foreground">Trip saved & confirmed notifications</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e6fdf9", color: TEAL }}>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-border">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive trip save & confirm emails</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: emailEnabled ? TEAL : "#d1d5db" }}
            >
              <div
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: emailEnabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {saved && (
            <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Preference updated!
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-semibold text-sm border border-border hover:bg-muted/50 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}