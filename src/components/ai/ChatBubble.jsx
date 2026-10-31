import { motion } from "framer-motion";

// Conversational bubble — assistant left (frosted), user right (teal).
export default function ChatBubble({ from = "assistant", children, delay = 0 }) {
  const isAssistant = from === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
          isAssistant
            ? "bg-white/[0.06] border border-white/10 text-foreground rounded-bl-sm lg:bg-white lg:border-[#e4e9f2] lg:text-[#102149] lg:shadow-[0_4px_14px_rgba(16,33,73,0.045)]"
            : "bg-primary text-primary-foreground rounded-br-sm font-medium"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}
