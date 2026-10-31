import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function DisclaimerModal() {
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u && !u.disclaimer_acknowledged) {
        setUserId(u.id);
        setShow(true);
      }
    }).catch(() => {});
  }, []);

  const handleAcknowledge = async () => {
    setShow(false);
    if (userId) {
      await base44.entities.User.update(userId, { disclaimer_acknowledged: true }).catch(() => {});
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7"
          >
            <div className="text-center mb-5">
              <p className="text-4xl mb-3">🌍</p>
              <h2 className="font-black text-xl tracking-tight">Before You Explore</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              DheeVoy uses AI to plan your travels. AI can make mistakes — always verify visa requirements,
              flight times and safety advisories with official sources before you travel.
              <br /><br />
              We earn commission from travel partners at no extra cost to you.
            </p>
            <Button
              onClick={handleAcknowledge}
              className="w-full rounded-full bg-black text-white hover:bg-black/80 h-12 text-base font-semibold gap-2"
            >
              Got it, let's go →
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}