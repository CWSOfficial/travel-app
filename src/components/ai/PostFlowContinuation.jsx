import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ChatBubble from "./ChatBubble";

// Shared "What's next?" panel shown after an AI flow reaches its CTA.
// Routes map to existing in-app destinations — no new routes introduced.
const ACTIONS = [
  { label: "Buy an eSIM", to: "/esim" },
  { label: "Get Travel Insurance", to: "/insurance" },
  { label: "Explore Attractions & Tours", to: "/attractions" },
  { label: "Find Recommended Hotels", to: "/" },
  { label: "Compare Flights", to: "/" },
];

export default function PostFlowContinuation({ onAskQuestion }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <ChatBubble from="assistant">What's next? I can help with any of these 👇</ChatBubble>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a, i) => (
          <motion.button
            key={a.label}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(a.to)}
            className="px-4 py-2 rounded-full text-sm border border-white/15 bg-white/[0.05] hover:border-primary/60 hover:bg-white/[0.10] transition-colors"
          >
            {a.label}
          </motion.button>
        ))}
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: ACTIONS.length * 0.05 }}
          onClick={onAskQuestion}
          className="px-4 py-2 rounded-full text-sm border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          Ask AI another question
        </motion.button>
      </div>
    </div>
  );
}