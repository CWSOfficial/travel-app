import { motion } from "framer-motion";

// Quick-reply chips. options: array of strings OR { label, value }.
export default function QuickReplies({ options, onSelect, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, i) => {
        const label = typeof opt === "string" ? opt : opt.label;
        const value = typeof opt === "string" ? opt : opt.value ?? opt.label;
        return (
          <motion.button
            key={label}
            type="button"
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect({ label, value })}
            className="px-4 py-2 rounded-full text-sm border border-white/15 bg-white/[0.05] hover:border-primary/60 hover:bg-white/[0.10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed lg:border-[#dbe4ef] lg:bg-white lg:text-[#102149] lg:shadow-[0_3px_10px_rgba(16,33,73,0.035)] lg:hover:bg-[#f2f9ff]"
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
