import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlashDealCard from "@/components/travel/FlashDealCard";
import { trackAffiliateClick } from "@/lib/trackAffiliateClick";

export default function FlashDealsSection({ currencyCode, destination, departureCity }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expediaLink, setExpediaLink] = useState(null);

  useEffect(() => {
    // Fetch flash deals + Expedia affiliate link in parallel
    const loadDeals = base44.functions.invoke("fetchFlashDeals", { currency: currencyCode || "usd", origin_city: departureCity || "" })
      .then((res) => {
        if (res.data?.error) {
          setError(res.data.error);
        } else {
          setDeals(res.data?.deals || []);
        }
      })
      .catch(() => setError("Could not load flash deals right now."))
      .finally(() => setLoading(false));

    const loadExpedia = base44.entities.AffiliateLink.filter({ status: "active" })
      .then((links) => {
        const expedia = links.find((l) => l.partner_name?.toLowerCase().includes("expedia") && l.partner_name?.toLowerCase().includes("flight"));
        setExpediaLink(expedia?.affiliate_link || null);
      })
      .catch(() => {});

    return () => {};
  }, [currencyCode, departureCity]);

  // Only show deals that match the user's origin city or region — never filler
  const relevantDeals = departureCity ? deals.filter((d) => d.origin_match) : deals;

  const handleExpediaClick = () => {
    trackAffiliateClick({
      partner_name: "Expedia (Deals)",
      context: "general",
      pillar: "general",
      page: "FlashDealsSection",
      destination: destination || undefined,
    });
  };

  // Tracked Expedia deals page — uses the direct affiliate deals link, do not modify the path
  const expediaDealsUrl = "https://expedia.com/affiliates/dheetrip/deals";

  return (
    <div className="mb-6 p-4 bg-card border border-amber-300/30 rounded-2xl">
      <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-600" /> Flash Deals
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Unusually low flight prices discovered by travellers — these are cached deals that may expire quickly.
      </p>

      {/* Deal cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <p className="text-xs text-muted-foreground">Finding flash deals...</p>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl text-xs text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error} You can still check current offers below.</p>
        </div>
      ) : relevantDeals.length === 0 ? (
        <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Click the link below for checking suitable flash deals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {relevantDeals.map((deal, i) => (
            <FlashDealCard key={i} deal={deal} />
          ))}
        </div>
      )}

      {/* Expedia current offers link */}
      {expediaDealsUrl && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <a href={expediaDealsUrl} target="_blank" rel="noopener noreferrer" onClick={handleExpediaClick}>
            <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
              🏷️ Check current offers on Expedia <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            Opens Expedia's public deals page — not specific tracked discounts.
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
        Flash deals are cached prices from Aviasales and may expire. Always verify final price on the booking site.
      </p>
    </div>
  );
}