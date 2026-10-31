import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// Shared loading indicator for conversational AI flows.
// Shows a spinner + subtext for the full duration of the LLM wait (10–15s),
// matching the chat-bubble style used across all flow pages.
export default function FlowLoadingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5">
        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          This usually takes about 10–15 seconds for the best results.
        </p>
      </div>
    </motion.div>
  );
}