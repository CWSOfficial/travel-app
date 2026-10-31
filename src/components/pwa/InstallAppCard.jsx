import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus, CheckCircle2, Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/usePwaInstall";

export default function InstallAppCard() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Already installed — show confirmation, no action needed
  if (isInstalled && !justInstalled) {
    return (
      <div className="p-4 rounded-2xl border border-green-200 bg-green-50 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">App Installed</p>
          <p className="text-xs text-green-600">DheeVoy is running from your home screen.</p>
        </div>
      </div>
    );
  }

  // Don't show the card if no install path is available (not Chrome, not iOS)
  if (!canInstall && !isIOS) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const { outcome } = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") setJustInstalled(true);
  };

  return (
    <>
      <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Install DheeVoy App</p>
            <p className="text-xs text-muted-foreground">
              {isIOS
                ? "Add to your home screen for quick access"
                : "Faster access — works offline"}
            </p>
          </div>
        </div>
        {isIOS ? (
          <Button
            variant="outline"
            className="w-full rounded-xl gap-2 text-sm border-slate-300 hover:bg-slate-50"
            onClick={() => setShowIOSModal(true)}
          >
            <Download className="w-4 h-4" /> How to Install
          </Button>
        ) : (
          <Button
            className="w-full rounded-xl gap-2 text-sm bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Installing...</>
            ) : (
              <><Download className="w-4 h-4" /> Install App</>
            )}
          </Button>
        )}
      </div>

      {/* iOS Safari instructions modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Install DheeVoy</h3>
                <button onClick={() => setShowIOSModal(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-5">
                Follow these steps in Safari to add DheeVoy to your home screen:
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-sm font-medium">Tap the Share button</p>
                    <p className="text-xs text-muted-foreground">It's at the bottom of the screen.</p>
                    <Share className="w-5 h-5 text-blue-500 mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="text-sm font-medium">Select "Add to Home Screen"</p>
                    <p className="text-xs text-muted-foreground">Scroll down and tap this option.</p>
                    <Plus className="w-5 h-5 text-slate-600 mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold flex-shrink-0 text-green-700">3</div>
                  <div>
                    <p className="text-sm font-medium">Tap "Add"</p>
                    <p className="text-xs text-muted-foreground">DheeVoy will appear on your home screen.</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6 rounded-xl gap-2 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setShowIOSModal(false)}
              >
                Got it
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}