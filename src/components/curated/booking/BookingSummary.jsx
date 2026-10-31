import { formatPerPerson } from "../detail/helpers";

// Compact persistent order summary shown during booking steps.
export default function BookingSummary({ trip, adults, children, totalPayable }) {
  const pp = formatPerPerson(trip);
  const total = adults + children;
  return (
    <div className="rounded-xl bg-curated-surface border border-curated-border p-3.5">
      <p className="font-semibold text-sm text-curated-heading truncate">{trip?.trip_title}</p>
      <p className="text-xs text-curated-muted mt-0.5">
        {trip?.destination} • {trip?.days} day{trip?.days !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-curated-border">
        <p className="text-[11px] text-curated-muted">
          {total} traveller{total !== 1 ? "s" : ""}
          {pp ? ` × ${pp.currency} ${pp.amount}` : ""}
        </p>
        <p className="font-bold text-curated-heading text-sm">
          {trip?.currency || "USD"} {totalPayable}
        </p>
      </div>
    </div>
  );
}