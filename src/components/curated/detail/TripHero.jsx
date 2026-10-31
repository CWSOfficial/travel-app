import { MapPin } from "lucide-react";
import BookingSummaryCard from "./BookingSummaryCard";
import { serviceLabel, serviceSubLabel, buildHighlights, nightsFromDays } from "./helpers";

// Premium package hero. Desktop: full-bleed destination image with overlay,
// left content + right booking card. Mobile: image + content stack.
export default function TripHero({ trip, onSelect, selecting }) {
  const photos = trip?.photos || [];
  const heroImg = photos[0];
  const highlights = buildHighlights(trip);
  const nights = nightsFromDays(trip?.days);
  const chips = [
    trip?.days ? `${trip.days} day${trip.days !== 1 ? "s" : ""}` : null,
    serviceLabel(trip?.dfy_or_dwy),
    trip?.min_group_size && trip?.max_group_size
      ? `${trip.min_group_size}–${trip.max_group_size} travellers`
      : null,
  ].filter(Boolean);

  return (
    <section className="relative">
      {/* ── Desktop hero ── */}
      <div className="hidden md:block relative h-[540px] overflow-hidden rounded-b-[2rem]">
        {heroImg ? (
          <img src={heroImg} alt={trip?.trip_title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-curated-heading" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
        <div className="relative max-w-6xl mx-auto px-6 h-full grid grid-cols-5 gap-8 items-center">
          <div className="col-span-3 text-white">
            <div className="flex items-center gap-1.5 text-sm font-medium text-white/90 mb-3">
              <MapPin className="w-4 h-4 text-curated-accent" /> {trip?.destination}
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight mb-3">
              {trip?.trip_title}
            </h1>
            <p className="text-base text-white/85 max-w-xl leading-relaxed mb-4">
              {trip?.days}-day {serviceSubLabel(trip?.dfy_or_dwy)} in {trip?.destination}, curated by a local travel expert.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {chips.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white border border-white/20"
                >
                  {c}
                </span>
              ))}
            </div>
            {highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/90">
                    <h.icon className="w-4 h-4 text-curated-accent shrink-0" /> {h.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-2 flex justify-end">
            <BookingSummaryCard trip={trip} onSelect={onSelect} selecting={selecting} nights={nights} />
          </div>
        </div>
      </div>

      {/* ── Mobile hero ── */}
      <div className="md:hidden">
        <div className="relative h-64 overflow-hidden">
          {heroImg ? (
            <img src={heroImg} alt={trip?.trip_title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-curated-heading" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="flex items-center gap-1 text-xs font-medium text-white/90 mb-1">
              <MapPin className="w-3.5 h-3.5 text-curated-accent" /> {trip?.destination}
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight">{trip?.trip_title}</h1>
          </div>
        </div>
        <div className="bg-curated-bg px-4 py-4">
          <p className="text-sm text-curated-text mb-2">
            {trip?.days}-day {serviceSubLabel(trip?.dfy_or_dwy)} in {trip?.destination}, curated by a local travel expert.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {chips.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-curated-surface px-2.5 py-1 text-[11px] font-semibold text-curated-text border border-curated-border"
              >
                {c}
              </span>
            ))}
          </div>
          <BookingSummaryCard trip={trip} onSelect={onSelect} selecting={selecting} nights={nights} mobile />
        </div>
      </div>
    </section>
  );
}