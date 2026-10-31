import { useState } from "react";
import { motion } from "framer-motion";
import { X, User, Mail, Phone, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackLead } from "@/lib/metaCapi";

const TEAL = "#00E5CC";

export default function EditProfileModal({ user, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await base44.auth.updateMe({ phone_number: phoneNumber });
      setSaved(true);
      // Lead — meaningful profile info (phone) submitted = qualified lead. Fires once per user.
      if (phoneNumber && phoneNumber.trim()) {
        trackLead(user?.id || user?.email || "guest");
      }
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err?.message || "Could not save changes. Please try again.");
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
            <User className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="font-black text-xl">Edit Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Update your details below</p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Name — read-only (platform built-in) */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">Full Name</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.full_name || "Not set"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Name is managed by your account and cannot be changed here.</p>
          </div>

          {/* Email — read-only (platform built-in) */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">Email</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">{user?.email || "Not set"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Email is managed by your account and cannot be changed here.</p>
          </div>

          {/* Phone — editable */}
          <div>
            <Label htmlFor="phone" className="text-xs text-muted-foreground mb-1.5">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +44 7700 900123"
                className="pl-9"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {saved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Changes saved successfully!
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: TEAL }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}