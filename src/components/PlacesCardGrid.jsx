import { useQuery } from "@tanstack/react-query";
import {
  Star, MapPin, Loader2, ExternalLink, Camera, Utensils, Compass, Info, Sparkles,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";
import { buildFallbackPlaces } from "@/lib/nearbyFallback";

// Real Google Places text-only card grid for the Nearby tab.
// Calls fetchNearbyPlaces backend function (Text Search, geocoded 15km bias).
// On any failure the backend returns curated fallback places; if the invoke
// itself fails, a client-side fallback keeps the UI rendering rich cards —
// no error state is ever shown.
export default function PlacesCardGrid({ destination, category }) {
  const isFood = category === "food";
  const isThingsToDo = category === "things_to_do";
  const noun = isFood ? "restaurants" : isThingsToDo ? "things to do" : "places";
  const CategoryIcon = isFood ? Utensils : isThingsToDo ? Compass : Camera;

  const { data, isLoading } = useQuery({
    queryKey: ["nearby-places", destination?.name, category],
    queryFn: async () => {
      // Secure server proxy — the Google API key and caller verification
      // live entirely server-side now (platform token + per-IP rate limit).
      try {
        const res = await base44.functions.invoke("fetchNearbyPlaces", {
          destination: destination.name,
          category,
        });
        return res.data;
      } catch (e) {
        // Invoke itself failed (network/infra) — render client-side fallback
        // so the user never sees an error state.
        console.error("fetchNearbyPlaces invoke failed:", e);
        return { places: buildFallbackPlaces(destination.name, category), fallback: true };
      }
    },
    enabled: !!destination?.name,
    staleTime: 1000 * 60 * 10, // 10-min cache to reduce API calls
    retry: false,
  });

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    (isFood ? "restaurants in " : "things to do in ") + (destination?.name || "")
  )}`;

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">
          Finding real {noun}…
        </span>
      </div>
    );
  }

  const places = data?.places || [];
  const isFallback = data?.fallback || places.some((p) => p.fallback);

  // Honest empty state — no results and no fallback (shouldn't normally happen)
  if (places.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-border p-6 text-center lg:rounded-[24px] lg:p-10 lg:shadow-[0_10px_30px_rgba(16,33,73,0.06)]">
        <CategoryIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">
          No {noun} found
        </p>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto leading-relaxed">
          We couldn't load {noun} for {destination?.name} right now. Try browsing on Google Maps
          directly.
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("nearby_external_link", { cat: category, destination: destination?.name })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-border text-sm font-semibold hover:border-primary/60 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Browse on Google Maps
        </a>
      </div>
    );
  }

  // Real results or curated fallback — text-only card grid
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 lg:text-sm lg:font-medium">
        {isFallback ? (
          <>
            <Sparkles className="w-3 h-3 text-primary" />
            Curated picks for {destination?.name}:
          </>
        ) : (
          <>
            Live from Google Places — {places.length} {noun} near {destination?.name}:
          </>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {places.map((place, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-border p-4 hover:border-primary/40 transition-colors lg:rounded-[20px] lg:border-border/80 lg:p-5 lg:shadow-[0_4px_16px_rgba(16,33,73,0.045)] lg:hover:-translate-y-0.5 lg:hover:shadow-[0_12px_26px_rgba(16,33,73,0.10)] lg:transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-sm leading-tight">{place.name}</p>
              {place.categoryTag && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap shrink-0">
                  {place.categoryTag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {place.rating != null && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {place.rating.toFixed(1)}
                </span>
              )}
              {place.reviewCount != null && (
                <span>{place.reviewCount.toLocaleString()} reviews</span>
              )}
            </div>
            {place.address && (
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {place.address}
              </p>
            )}
            {place.mapsUrl && (
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("nearby_external_link", { cat: category, destination: destination?.name })
                }
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View on Google Maps
              </a>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-start gap-1.5 px-1">
        <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isFallback
            ? "Live data is temporarily unavailable — these curated discovery links open Google Maps. Details may change — always verify before visiting."
            : "Data from Google Places API. Ratings and details may change — always verify before visiting."}
        </p>
      </div>
    </div>
  );
}
