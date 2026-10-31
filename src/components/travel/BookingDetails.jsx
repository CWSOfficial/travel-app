import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plane, Hotel, ExternalLink, ArrowLeft,
  CloudSun, ShieldCheck, Calendar, Wallet,
  Loader2, Tag, TrendingDown, CheckCircle2, Stamp
} from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { trackAffiliateClick } from "@/lib/trackAffiliateClick";

const AVIASALES_FALLBACK = "https://aviasales.tpo.lu/I38YowLq";

function getLinkByKeyword(links, keyword) {
  return links.find(l => l.partner_name?.toLowerCase().includes(keyword.toLowerCase()))?.affiliate_link;
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1200&q=80",
];

function singleCity(name = "") {
  return name.split(/,|&/)[0].trim();
}



export default function BookingDetails({
  destination, preferences, promos, isLoadingPromos,
  onBack, onConfirmReady, isSaving
}) {
  const [affiliateLinks, setAffiliateLinks] = useState([]);

  useEffect(() => {
    base44.entities.AffiliateLink.filter({ status: "active" }).then(setAffiliateLinks).catch(() => {});
  }, []);

  const startDate = preferences.start_date;
  const endDate = (() => {
    const d = new Date(preferences.start_date);
    d.setDate(d.getDate() + parseInt(preferences.duration_days));
    return d.toISOString().split("T")[0];
  })();

  const adults = preferences.num_travelers || (
    preferences.group_type === "family" ? 4 :
    preferences.group_type === "couple" ? 2 : 1
  );

  const cityName = singleCity(destination.name);
  const heroImg = FALLBACK_IMAGES[Math.abs((destination.name || "").charCodeAt(0)) % FALLBACK_IMAGES.length];

  // Exact partner_name matches from DB
  const expediaFlightsRec = affiliateLinks.find(l => l.partner_name === "Expedia (Flights)");
  const aviasalesRec = affiliateLinks.find(l => l.partner_name === "Aviasales");
  const expediaHotelsRec = affiliateLinks.find(l => l.partner_name === "Expedia (Hotels)");
  const hotelsComRec = affiliateLinks.find(l => l.partner_name === "Hotel.com");

  const expediaFlightsUrl = expediaFlightsRec?.affiliate_link || "https://expedia.com/Flights";
  const aviasalesUrl = aviasalesRec?.affiliate_link || AVIASALES_FALLBACK;
  const expediaHotelsUrl = expediaHotelsRec?.affiliate_link || "https://expedia.com/Hotels";
  const hotelsComUrl = hotelsComRec?.affiliate_link;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4"
    >
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-5 rounded-full text-muted-foreground text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to recommendations
      </Button>

      {/* Hero */}
      <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden mb-5 shadow-lg">
        <img src={heroImg} alt={cityName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10" />
        <div className="absolute bottom-5 left-5 right-5">
          <h2 className="font-black text-2xl md:text-3xl text-white">{cityName}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-white/20 backdrop-blur text-white rounded-full px-3 py-1 flex items-center gap-1">
              <CloudSun className="w-3 h-3" /> {destination.weather}
            </span>
            <span className="text-xs bg-white/20 backdrop-blur text-white rounded-full px-3 py-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {destination.safety_rating}{destination.safety_index_score != null ? ` · ${destination.safety_index_score}/100` : ""}
            </span>
            <span className="text-xs bg-white/20 backdrop-blur text-white rounded-full px-3 py-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {preferences.duration_days} days
            </span>
            {destination.visa_requirement && (
              <span className="text-xs bg-white/20 backdrop-blur text-white rounded-full px-3 py-1 flex items-center gap-1">
                <Stamp className="w-3 h-3" /> {destination.visa_requirement}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI recommendation card */}
      <Card className="p-4 border-border shadow-sm mb-4 rounded-2xl bg-black text-white">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black">D</div>
          <span className="text-xs font-bold text-white/70">Dbuddy AI · Your Travel Companion</span>
        </div>
        <p className="text-sm leading-relaxed">{destination.why_recommended}</p>
      </Card>

      {/* Visa & Safety */}
      {(destination.visa_requirement || destination.safety_rating) && (
        <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <Stamp className="w-4 h-4 text-blue-600" /> Passport & Safety Intelligence
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {destination.visa_requirement && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Stamp className="w-3 h-3" /> Visa Requirement</p>
                <p className="text-sm font-bold text-blue-900">{destination.visa_requirement}</p>
                {destination.visa_notes && <p className="text-xs text-blue-600 mt-1">{destination.visa_notes}</p>}
              </div>
            )}
            {destination.safety_rating && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Safety Rating</p>
                <p className="text-sm font-bold text-green-900">{destination.safety_rating}</p>
                {destination.safety_index_score != null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-green-700 mb-1">
                      <span>Safety Index</span><span>{destination.safety_index_score}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-green-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${destination.safety_index_score}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cost breakdown */}
      <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Wallet className="w-4 h-4" /> Estimated Costs
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          {[
            { label: "Flights", val: destination.flight_cost, icon: Plane },
            { label: "Hotel", val: destination.hotel_cost, icon: Hotel },
            { label: "Activities", val: destination.activities_cost, icon: Tag },
          ].map(({ label, val, icon: Icon }) => (
            <div key={label} className="p-3 bg-muted rounded-xl">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-bold text-sm">{val}</p>
            </div>
          ))}
        </div>
        <Separator className="mb-4" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Estimated</span>
          <span className="text-xl font-black">{destination.total_cost}</span>
        </div>
      </Card>

      {/* Promo codes */}
      {(isLoadingPromos || (promos && promos.length > 0)) && (
        <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-green-600" /> Active Promo Codes
            {isLoadingPromos && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
          </h3>
          {isLoadingPromos ? (
            <p className="text-xs text-muted-foreground">Searching for live offers...</p>
          ) : (
            <div className="space-y-2">
              {promos.map((promo, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                  <div>
                    <p className="font-mono font-bold text-sm text-green-800">{promo.code}</p>
                    <p className="text-xs text-muted-foreground">{promo.platform} · {promo.description}</p>
                  </div>
                  <span className="text-sm font-bold text-green-700">-{promo.discount_percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Flights — Expedia (direct affiliate) + Aviasales (TP) */}
      <Card className="p-5 border-border shadow-sm mb-4 rounded-2xl">
        <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
          <Plane className="w-4 h-4" /> Book Your Flights
        </h3>
        <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground mb-4 space-y-1">
          <p>✈️ From: <span className="font-medium text-foreground">{singleCity(preferences.departure_city)}</span></p>
          <p>📍 To: <span className="font-medium text-foreground">{cityName}</span></p>
          <p>📅 Dates: <span className="font-medium text-foreground">{format(new Date(startDate), "dd MMM")} – {format(new Date(endDate), "dd MMM yyyy")}</span></p>
          <p>👥 Travellers: <span className="font-medium text-foreground">{adults}</span> · 💰 Est. <span className="font-medium text-foreground">{destination.flight_cost}</span></p>
        </div>
        <div className="space-y-2">
          <a href={expediaFlightsUrl} target="_blank" rel="noopener noreferrer"
             onClick={() => trackAffiliateClick({ partner_name: "Expedia (Flights)", affiliate_link_id: expediaFlightsRec?.id, context: "flight", pillar: "PLAN", page: "BookingDetails", destination: cityName })}>
            <Button className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 gap-2">
              🌐 Expedia — Search Flights <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
          <a href={aviasalesUrl} target="_blank" rel="noopener noreferrer"
             onClick={() => trackAffiliateClick({ partner_name: "Aviasales", affiliate_link_id: aviasalesRec?.id, context: "flight", pillar: "PLAN", page: "BookingDetails", destination: cityName })}>
            <Button variant="outline" className="w-full rounded-xl gap-2">
              ✈️ Aviasales — Compare Cheapest Fares <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">Affiliate links · Prices update live on each platform</p>
      </Card>

      {/* Hotels — Expedia + Hotels.com */}
      <Card className="p-5 border-border shadow-sm mb-6 rounded-2xl">
        <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
          <Hotel className="w-4 h-4 text-amber-600" /> Book Your Hotel
        </h3>
        <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground mb-4 space-y-1">
          <p>📍 <span className="font-medium text-foreground">{cityName}</span></p>
          <p>📅 Check-in: <span className="font-medium text-foreground">{format(new Date(startDate), "dd MMM yyyy")}</span> · Check-out: <span className="font-medium text-foreground">{format(new Date(endDate), "dd MMM yyyy")}</span></p>
          <p>💰 Est. hotel: <span className="font-medium text-foreground">{destination.hotel_cost}</span></p>
        </div>
        <div className="space-y-2">
          <a href={expediaHotelsUrl} target="_blank" rel="noopener noreferrer"
             onClick={() => trackAffiliateClick({ partner_name: "Expedia (Hotels)", affiliate_link_id: expediaHotelsRec?.id, context: "hotel", pillar: "PLAN", page: "BookingDetails", destination: cityName })}>
            <Button className="w-full rounded-xl bg-amber-600 text-white hover:bg-amber-700 gap-2">
              🏨 Expedia — Find & Book Hotels <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
          {hotelsComUrl && (
            <a href={hotelsComUrl} target="_blank" rel="noopener noreferrer"
               onClick={() => trackAffiliateClick({ partner_name: "Hotel.com", affiliate_link_id: hotelsComRec?.id, context: "hotel", pillar: "PLAN", page: "BookingDetails", destination: cityName })}>
              <Button variant="outline" className="w-full rounded-xl gap-2 border-rose-200 text-rose-700 hover:bg-rose-50">
                🏩 Hotels.com — Compare & Book <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">Affiliate links · Prices update live on each platform</p>
      </Card>

      <p className="text-xs text-center text-muted-foreground mb-6">
        All prices are estimates. Live pricing shown on each platform. Apply promo codes at checkout.
      </p>

      <div className="text-center pb-10">
        <Button
          size="lg"
          onClick={onConfirmReady}
          disabled={isSaving}
          className="rounded-full px-10 gap-2 bg-black hover:bg-black/80 text-white shadow-xl text-base"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> I've Booked — Save My Trip</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">We'll save your trip and activate your travel notifications</p>
      </div>
    </motion.div>
  );
}