import { useQuery } from "@tanstack/react-query";
import { Loader2, Hotel, ExternalLink, Info, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import HotelCard from "@/components/HotelCard";
import { buildFallbackPlaces } from "@/lib/nearbyFallback";

// Real hotel results grid for the Stays tab — calls fetchNearbyPlaces with
// category="lodging" and renders photo cards with per-property affiliate links.
// On any failure the backend returns curated fallback places; if the invoke
// itself fails, a client-side fallback keeps the UI rendering — no error state.
export default function HotelsResultsGrid({ destination }) {
  const { data, isLoading } = useQuery({
    queryKey: ["nearby-places", destination?.name, "lodging"],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("fetchNearbyPlaces", {
          destination: destination.name,
          category: "lodging",
        });
        return res.data;
      } catch (e) {
        console.error("fetchNearbyPlaces invoke failed:", e);
        return { places: buildFallbackPlaces(destination.name, "lodging"), fallback: true };
      }
    },
    enabled: !!destination?.name,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    "hotels in " + (destination?.name || "")
  )}`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Finding real hotels…</span>
      </div>
    );
  }

  const places = data?.places || [];
  const isFallback = data?.fallback || places.some((p) => p.fallback);

  if (places.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-border p-6 text-center">
        <Hotel className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">No hotels found</p>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto leading-relaxed">
          We couldn't load hotels for {destination?.name} right now. Try browsing on Google Maps directly.
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("nearby_external_link", { cat: "lodging", destination: destination?.name })}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-border text-sm font-semibold hover:border-primary/60 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Browse on Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
        {isFallback ? (
          <>
            <Sparkles className="w-3 h-3 text-primary" />
            Curated stays for {destination?.name}:
          </>
        ) : (
          <>
            Live from Google Places — {places.length} hotels near {destination?.name}:
          </>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {places.map((place, i) =>
          place.fallback ? (
            <div
              key={i}
              className="rounded-2xl bg-white border border-border p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm leading-tight">{place.name}</p>
                {place.categoryTag && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap shrink-0">
                    {place.categoryTag}
                  </span>
                )}
              </div>
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("nearby_external_link", { cat: "lodging", destination: destination?.name })}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View on Google Maps
              </a>
            </div>
          ) : (
            <HotelCard key={i} place={place} destination={destination.name} />
          )
        )}
      </div>
      <div className="flex items-start gap-1.5 px-1">
        <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isFallback
            ? "Live hotel data is temporarily unavailable — these curated links open Google Maps. Booking links are affiliate links — DheeVoy may earn a commission."
            : "Hotel data from Google Places API. Booking links are affiliate links — DheeVoy may earn a commission. Always verify pricing on the partner site."}
        </p>
      </div>
    </div>
  );
}