import { motion } from "framer-motion";
import { Plane, BedDouble, Wifi, ExternalLink, Tag } from "lucide-react";
import { buildAviasalesSearchUrl } from "@/lib/aviasalesUrl";
import {
  buildExpediaHotelSearchUrl,
  buildHotelsComSearchUrl,
  buildBookingComSearchUrl,
} from "@/lib/hotelAffiliateLinks";
import { trackAffiliateClick } from "@/lib/trackAffiliateClick";
import { trackEvent } from "@/lib/analytics";

function endDateStr(start, days) {
  if (!start || !days) return "";
  const d = new Date(start + "T00:00:00");
  d.setDate(d.getDate() + parseInt(days));
  return d.toISOString().split("T")[0];
}

function BookingCard({ icon: Icon, title, subtitle, price, partners, onTrack, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {price && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-muted/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Est. from</p>
          <p className="text-lg font-bold text-primary">{price}</p>
        </div>
      )}

      <div className="mt-auto space-y-2">
        {partners.map((p) => (
          <a
            key={p.label}
            href={p.url}
            target="_blank"
            rel="nofollow sponsored"
            onClick={() => onTrack(p)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/40 transition-colors text-sm font-medium min-h-[44px]"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              {p.label}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        ))}
      </div>
    </motion.div>
  );
}

export default function SmartBookingHub({ destination, preferences, onAffiliateClick }) {
  const destCity = destination?.city || (destination?.name || "").split(",")[0].trim() || "";
  const destName = destination?.name || destCity;
  const departCity = preferences?.departure_city || "";
  const startDate = preferences?.start_date || "";
  const days = preferences?.duration_days || 1;
  const endStr = endDateStr(startDate, days);
  const adults = preferences?.num_travelers || 1;

  const flightUrl = buildAviasalesSearchUrl(departCity, destCity, startDate, endStr);
  const expediaUrl = buildExpediaHotelSearchUrl(destName, startDate, endStr, adults);
  const hotelsComUrl = buildHotelsComSearchUrl(destName, startDate, endStr, adults);
  const bookingUrl = buildBookingComSearchUrl(destName, startDate, endStr, adults);

  const handleTrack = (partner) => {
    trackAffiliateClick({
      partner_name: partner.label,
      context: partner.context,
      pillar: "PLAN",
      page: "TripDashboard",
      destination: destName,
    });
    trackEvent("dashboard_affiliate_click", { partner: partner.label, context: partner.context });
    if (onAffiliateClick) onAffiliateClick(partner.context);
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Flights */}
      <BookingCard
        icon={Plane}
        title="Flights"
        subtitle={`${departCity || "Your city"} → ${destCity || "Destination"}`}
        price={destination?.flight_cost || "Search live"}
        accent="bg-sky-500/15 text-sky-400"
        partners={[{ label: "Aviasales", url: flightUrl, context: "flight" }]}
        onTrack={handleTrack}
      />

      {/* Stays */}
      <BookingCard
        icon={BedDouble}
        title="Stays"
        subtitle={`${days} night${days !== 1 ? "s" : ""} · ${adults} guest${adults !== 1 ? "s" : ""}`}
        price={destination?.hotel_cost || "Search live"}
        accent="bg-violet-500/15 text-violet-400"
        partners={[
          { label: "Expedia", url: expediaUrl, context: "hotel" },
          { label: "Booking.com", url: bookingUrl, context: "hotel" },
          { label: "Hotels.com", url: hotelsComUrl, context: "hotel" },
        ]}
        onTrack={handleTrack}
      />

      {/* eSIM */}
      <BookingCard
        icon={Wifi}
        title="eSIM Data"
        subtitle="Stay connected abroad"
        price="From $4"
        accent="bg-emerald-500/15 text-emerald-400"
        partners={[{ label: "Get eSIM (CellESIM)", url: "https://cellesim.com/r/dheevoy-limited-rze", context: "general" }]}
        onTrack={handleTrack}
      />
    </div>
  );
}