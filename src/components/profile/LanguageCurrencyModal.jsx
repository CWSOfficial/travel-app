import { useState } from "react";
import { motion } from "framer-motion";
import { X, Globe, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const TEAL = "#00E5CC";

const CURRENCIES = [
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
];

export default function LanguageCurrencyModal({ user, onClose }) {
  const [selectedCurrency, setSelectedCurrency] = useState(user?.preferred_currency || "GBP");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = (code) => {
    setSelectedCurrency(code);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await base44.auth.updateMe({ preferred_currency: selectedCurrency });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose?.();
      }, 1200);
    } catch (err) {
      setError(err?.message || "Could not save. Please try again.");
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
            <Globe className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="font-black text-xl">Language & Currency</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose your preferred currency</p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Language — static, English only */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Language</p>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 border border-border">
              <span className="text-sm font-medium">English</span>
              <span className="text-xs text-muted-foreground">Only available</span>
            </div>
          </div>

          {/* Currency selection */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Currency</p>
            <div className="space-y-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => handleSelect(c.code)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                    selectedCurrency === c.code
                      ? "border-current bg-slate-50"
                      : "border-border hover:bg-muted/30"
                  }`}
                  style={selectedCurrency === c.code ? { borderColor: TEAL } : {}}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold w-6 text-center">{c.symbol}</span>
                    <div>
                      <p className="text-sm font-medium">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                    </div>
                  </div>
                  {selectedCurrency === c.code && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: TEAL }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {saved && (
            <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Currency saved! Reloading...
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: TEAL }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Currency"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}