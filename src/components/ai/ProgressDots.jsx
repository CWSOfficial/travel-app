// Lightweight progress indicator — subtle dots that fill as the user advances.
export default function ProgressDots({ total, current }) {
  if (!total || total < 2) return null;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${Math.min(current + 1, total)} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current ? "w-5 bg-primary" : i === current ? "w-5 bg-primary/50" : "w-1.5 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}