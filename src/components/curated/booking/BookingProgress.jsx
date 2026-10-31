// 3-step progress indicator with clear labels: 1 Travellers · 2 Your Details · 3 Payment
const STEPS = [
  { key: "A", label: "Travellers" },
  { key: "B", label: "Your Details" },
  { key: "C", label: "Payment" },
];
const ORDER = ["A", "B", "C"];

export default function BookingProgress({ current }) {
  const currentIdx = ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                current === s.key
                  ? "bg-curated-accent text-curated-accent-fg"
                  : currentIdx > i
                  ? "bg-curated-accent/20 text-curated-accent border border-curated-accent"
                  : "bg-curated-surface text-curated-muted border border-curated-border"
              }`}
            >
              {currentIdx > i ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                current === s.key ? "text-curated-heading" : "text-curated-muted"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < 2 && (
            <div
              className={`h-0.5 flex-1 rounded-full ${
                currentIdx > i ? "bg-curated-accent/40" : "bg-curated-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}