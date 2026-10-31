import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

export default function WishlistTooltip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async u => {
      if (u && !u.wishlist_tooltip_shown) {
        // small delay so page settles first
        setTimeout(() => setShow(true), 1500);
      }
    }).catch(() => {});
  }, []);

  const dismiss = async () => {
    setShow(false);
    await base44.auth.updateMe({ wishlist_tooltip_shown: true });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          onClick={dismiss}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Tooltip card */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl mb-24"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#00E5CC" }}>
              <Heart className="w-7 h-7 text-white fill-white" />
            </div>
            <p className="font-black text-lg mb-1">✈️ Start your Wishlist</p>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Save destinations you dream of visiting — tap the ♡ heart icon on any destination to add it to your personal wishlist.
            </p>
            <button
              onClick={dismiss}
              className="w-full py-3 rounded-2xl font-bold text-white"
              style={{ backgroundColor: "#00E5CC" }}
            >
              Got it!
            </button>
            <p className="text-[10px] text-muted-foreground mt-3">Tap anywhere to dismiss</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}