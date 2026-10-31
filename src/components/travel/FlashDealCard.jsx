import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, Zap, ArrowRight } from "lucide-react";

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDeparture(iso) {
  if (!iso) return "Date TBC";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "short", month: "short", year: "numeric" });
  } catch {
    return "Date TBC";
  }
}

export default function FlashDealCard({ deal }) {
  return (
    <div className="flex flex-col p-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-400 hover:shadow-md transition-all">
      {/* Route — city names */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-foreground truncate">
          {deal.origin_city} → {deal.destination_city}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        {deal.origin_airport} → {deal.destination_airport}
        {deal.airline && ` · ${deal.airline} ${deal.flight_number}`}
      </p>

      {/* Price */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-black text-foreground">
          {deal.currency === "USD" ? "$" : deal.currency === "GBP" ? "£" : deal.currency === "EUR" ? "€" : deal.currency === "RUB" ? "₽" : ""}
          {deal.price?.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{deal.currency}</span>
      </div>

      {/* Departure + duration */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDeparture(deal.departure_at)}
        </span>
        {deal.duration > 0 && (
          <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] font-semibold">
            {formatDuration(deal.duration)}
          </Badge>
        )}
      </div>

      {/* Urgency note */}
      <p className="text-xs text-amber-700 flex items-center gap-1 mb-3">
        <Zap className="w-3 h-3" />
        Unusually low price — act fast
      </p>

      {/* CTA */}
      {deal.booking_url && (
        <a href={deal.booking_url} target="_blank" rel="noopener noreferrer" className="mt-auto">
          <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-amber-300 text-amber-800 hover:bg-amber-50">
            <Plane className="w-3 h-3" /> View on Aviasales <ArrowRight className="w-3 h-3" />
          </Button>
        </a>
      )}
    </div>
  );
}