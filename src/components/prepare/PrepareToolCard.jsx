import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

// Interactive card linking to an existing conversational flow.
export default function PrepareToolCard({ emoji, title, description, to, eventName, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Link
        to={to}
        onClick={() => trackEvent(eventName || "prepare_tool_click", { tool: title })}
        className="group block rounded-2xl border border-border/90 bg-card p-5 shadow-[0_2px_10px_rgba(16,33,73,0.045)] hover:border-primary/35 hover:shadow-[0_10px_28px_rgba(16,33,73,0.10)] hover:-translate-y-0.5 transition-all duration-200 min-h-[44px]"
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{emoji}</span>
          <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </span>
        </div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </Link>
    </motion.div>
  );
}
