import React from "react";

/**
 * Multi-select checkbox-tag picker for standardised fields (themes, languages).
 * value: string[] — the currently selected tags.
 * onChange: (next: string[]) => void
 */
export default function TagSelector({ options, value = [], onChange, max = null, columns = "grid-cols-2 sm:grid-cols-3" }) {
  const toggle = (tag) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, tag]);
    }
  };

  return (
    <div className={`grid ${columns} gap-2`}>
      {options.map((opt) => {
        const active = value.includes(opt);
        const disabled = !active && max && value.length >= max;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
              active
                ? "border-teal-400/60 bg-teal-500/20 text-teal-200"
                : disabled
                  ? "border-white/10 bg-white/[0.03] text-slate-500 opacity-50 cursor-not-allowed"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-teal-400/40 hover:bg-white/[0.08]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                  active ? "border-teal-400 bg-teal-400 text-black" : "border-slate-500"
                }`}
              >
                {active ? "✓" : ""}
              </span>
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}