import { Star, Hotel } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  buildExpediaPropertyUrl,
  buildHotelsComPropertyUrl,
  buildBookingComPropertyUrl,
} from "@/lib/hotelAffiliateLinks";

// Single hotel card with photo, rating, and 3 equal-choice affiliate links
// (Expedia, Hotels.com, Booking.com) — each pre-filled with a property-specific
// search for THIS hotel, not a generic destination search.
export default function HotelCard({ place, destination }) {
  const handleClick = (partner, url) => {
    trackEvent("nearby_hotel_card_click", { partner, hotel: place.name, destination });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const expediaUrl = buildExpediaPropertyUrl(place.name, destination);
  const hotelsComUrl = buildHotelsComPropertyUrl(place.name, destination);
  const bookingUrl = buildBookingComPropertyUrl(place.name, destination);

  return (
    <div className="rounded-2xl bg-white border border-border/90 overflow-hidden shadow-[0_3px_12px_rgba(16,33,73,0.055)] hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(16,33,73,0.11)] hover:-translate-y-0.5 transition-all duration-200">
      {/* Photo */}
      {place.photoUrl ? (
        <div className="aspect-[16/10] bg-muted overflow-hidden">
          <img
            src={place.photoUrl}
            alt={place.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-muted flex items-center justify-center">
          <Hotel className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-semibold text-sm leading-tight">{place.name}</p>
          {place.categoryTag && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap shrink-0">
              {place.categoryTag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {place.rating != null && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {place.rating.toFixed(1)}
            </span>
          )}
          {place.reviewCount != null && (
            <span>{place.reviewCount.toLocaleString()} reviews</span>
          )}
        </div>

        {/* Affiliate buttons — 3 equal choices, nothing pushed as default */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => handleClick("expedia", expediaUrl)}
            className="px-2 py-2 rounded-lg border border-border bg-muted/30 text-xs font-semibold text-foreground hover:border-primary/60 hover:bg-primary/10 transition-colors"
          >
            Expedia
          </button>
          <button
            onClick={() => handleClick("hotels_com", hotelsComUrl)}
            className="px-2 py-2 rounded-lg border border-border bg-muted/30 text-xs font-semibold text-foreground hover:border-primary/60 hover:bg-primary/10 transition-colors"
          >
            Hotels.com
          </button>
          <button
            onClick={() => handleClick("booking", bookingUrl)}
            className="px-2 py-2 rounded-lg border border-border bg-muted/30 text-xs font-semibold text-foreground hover:border-primary/60 hover:bg-primary/10 transition-colors"
          >
            Booking.com
          </button>
        </div>
      </div>
    </div>
  );
}
