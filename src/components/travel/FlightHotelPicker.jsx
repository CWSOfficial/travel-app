import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plane, Hotel, ArrowLeft, ExternalLink, ChevronRight,
  Clock, Luggage, Star, Coffee, CheckCircle2, Loader2, Wallet, AlertCircle, CalendarDays, Ticket, Car, Save,
  ShieldCheck, ClipboardList, ArrowRight
} from "lucide-react";
import { format } from "date-fns";

import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { trackAffiliateClick } from "@/lib/trackAffiliateClick";
import { useCurrency } from "@/lib/useCurrency";
import { buildAviasalesSearchUrl } from "@/lib/aviasalesUrl";
import { buildExpediaHotelSearchUrl } from "@/lib/hotelAffiliateLinks";

// Match a hotel's source string to the correct affiliate link record
function getHotelLink(source = "", affiliateLinks) {
  const s = source.toLowerCase();
  const match = affiliateLinks.find(l =>
    l.partner_name?.toLowerCase().includes(s) || s.includes(l.partner_name?.toLowerCase().split(" ")[0])
  );
  return match?.affiliate_link || null;
}

export default function FlightHotelPicker({
  destination, preferences, flightOptions, hotelOptions, nearbyFlightDates,
  isLoading, onBack, onConfirm, onSaveDraft, onRetryWithDate, isSaving, currentTripId, bookedTripId,
  onContinueToChecklist
}) {
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [affiliateLinks, setAffiliateLinks] = useState([]);
  const { currency } = useCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.AffiliateLink.filter({ status: "active" }).then(setAffiliateLinks).catch(() => {});
  }, []);

  // Reset selections when search results change (e.g., after retrying with a nearby date)
  useEffect(() => {
    setSelectedFlight(null);
    setSelectedHotel(null);
  }, [flightOptions, hotelOptions]);

  const startDate = preferences.start_date;
  const endDate = (() => {
    const d = new Date(preferences.start_date);
    d.setDate(d.getDate() + parseInt(preferences.duration_days));
    return d.toISOString().split("T")[0];
  })();

  const canContinue = selectedFlight !== null && selectedHotel !== null;
  const flight = canContinue ? flightOptions[selectedFlight] : null;
  const hotel = canContinue ? hotelOptions[selectedHotel] : null;

  const adults = preferences.num_travelers || 1;
  const cityName = destination.city || destination.name?.split(",")[0];

  // Build the Aviasales search URL using the shared utility (IATA codes + DDMM format)
  const aviasalesFallbackUrl = buildAviasalesSearchUrl(
    preferences.departure_city,
    cityName,
    startDate,
    endDate
  );

  // Build Booking.com deep link (CJ affiliate — Commission Junction tracking)
  const bookingComUrl = `https://www.dpbolvw.net/click-101812508-15734754?url=${encodeURIComponent(`https://www.booking.com/?ss=${cityName}&checkin=${startDate}&checkout=${endDate}&group_adults=${adults}&no_rooms=1`)}`;

  // Cost calculator: parse prices from selected options
  const parsePrice = (str = "") => {
    const num = parseFloat(str.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  };
  const currencySymbol = (str = "") => str.match(/[^0-9.,\s]/)?.[0] || "";

  const flightTotal = flight ? parsePrice(flight.price) * adults : 0;
  const hotelTotal = hotel ? parsePrice(hotel.total_price) : 0;
  const grandTotal = flightTotal + hotelTotal;
  const symbol = flight ? currencySymbol(flight.price) : hotel ? currencySymbol(hotel.total_price) : "";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Searching live flights & hotels...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto px-4 py-8"
    >
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-5 rounded-full text-muted-foreground text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to trip summary
      </Button>

      <h2 className="font-black text-2xl mb-1">Choose Your Flights & Hotel</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {preferences.departure_city} → {cityName} · {format(new Date(startDate), "dd MMM")} – {format(new Date(endDate), "dd MMM yyyy")} · {adults} traveller{adults > 1 ? "s" : ""}
      </p>

      {/* Flights */}
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
        <Plane className="w-4 h-4" /> Select a Flight Option
      </h3>
      {(flightOptions || []).length === 0 && (
        (nearbyFlightDates || []).length > 0 ? (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-900">
                Nearby dates with flight availability around {format(new Date(startDate), "dd MMM")}:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(nearbyFlightDates || []).map((d) => (
                <button
                  key={d.date}
                  onClick={() => onRetryWithDate(d.date)}
                  className="px-3 py-2.5 bg-white border border-amber-300 rounded-xl hover:border-amber-500 hover:shadow-sm transition-all text-center min-w-[90px] min-h-[44px] flex flex-col justify-center"
                >
                  <p className="text-xs font-bold text-foreground">{format(new Date(d.date), "dd MMM")}</p>
                  <p className="text-sm font-black text-amber-700">{d.price}</p>
                  <p className="text-[10px] text-muted-foreground">{d.is_direct ? "Direct" : "Stops"}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Tap a date to search flights for that departure.</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-muted/30 border border-border rounded-2xl text-center">
            <p className="text-sm text-muted-foreground mb-3">Click the link below for finding suitable flights.</p>
            <a href={aviasalesFallbackUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl gap-1.5 text-xs border-sky-300 text-sky-700 hover:bg-sky-50">
                ✈️ Search flights on Aviasales <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </div>
        )
      )}
      <div className="space-y-3 mb-6">
        {(flightOptions || []).map((f, i) => (
          <Card
            key={i}
            onClick={() => setSelectedFlight(i)}
            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedFlight === i ? "border-black shadow-lg" : "border-border hover:border-black/30"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">{f.airline}</span>
                  <span className="text-xs text-muted-foreground">{f.flight_number}</span>
                  {f.is_direct
                    ? <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">Direct</span>
                    : <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{f.stops} stop{f.stops > 1 ? "s" : ""}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="font-bold text-sm leading-tight">{(f.depart_time || "").split("T")[0]}</p>
                    {f.depart_time?.includes("T") && <p className="text-xs font-semibold text-foreground">{f.depart_time.split("T")[1]}</p>}
                    <p className="text-[10px] text-muted-foreground">{f.depart_airport}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-[10px] text-muted-foreground">{f.duration}</p>
                    <div className="w-full flex items-center gap-1">
                      <div className="flex-1 h-px bg-border" />
                      <Plane className="w-3 h-3 text-muted-foreground" />
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm leading-tight">{(f.arrive_time || "").split("T")[0]}</p>
                    {f.arrive_time?.includes("T") && <p className="text-xs font-semibold text-foreground">{f.arrive_time.split("T")[1]}</p>}
                    <p className="text-[10px] text-muted-foreground">{f.arrive_airport}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {f.includes_baggage && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Luggage className="w-3 h-3" /> Baggage incl.</span>}
                  {f.includes_meals && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Coffee className="w-3 h-3" /> Meal incl.</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm text-black">{f.price}</p>
                <p className="text-[10px] text-muted-foreground">per person</p>
                <p className="text-[10px] text-slate-400 mt-0.5">via {f.source}</p>
                {selectedFlight === i && <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 ml-auto" />}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border leading-tight">
              Prices shown are indicative. Final price confirmed at booking. DheeVoy earns commission from partners — you pay nothing extra.
            </p>
          </Card>
        ))}
      </div>

      {/* Ovago — secondary flight comparison (general search, not route-specific) */}
      <div className="mb-6 p-3 border border-dashed border-border rounded-2xl bg-muted/30">
        <a
          href="https://ovago.com/en-us/cheap-flights/?cid=OVAFCJ&utm_source=cj&utm_medium=Affiliate&utm_campaign=affiliate_af_cps_wrld_web_mul_awa_cja_aff_none_cheap-Flights&utm_content=&utm_term=text"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackAffiliateClick({ partner_name: "Ovago", affiliate_link_id: null, context: "flight", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}
        >
          <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground">
            ✈️ Also compare flights on Ovago <ExternalLink className="w-3 h-3" />
          </Button>
        </a>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">General flight search — enter your route & dates on Ovago.</p>
      </div>

      {/* Hotels */}
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
        <Hotel className="w-4 h-4" /> Select a Hotel
      </h3>

      {/* Booking.com — first hotel card, always visible */}
      <div className="mb-3">
        <a href={bookingComUrl} target="_blank" rel="noopener noreferrer"
           onClick={() => trackAffiliateClick({ partner_name: "Booking.com", affiliate_link_id: null, context: "hotel", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}
           className="block">
          <Card className="p-4 rounded-2xl transition-all border-2 border-border hover:border-black/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm">Search hotels in {cityName}</p>
                <div className="flex items-center gap-1 mt-0.5 mb-2">
                  {Array.from({ length: 3 }).map((_, s) => (
                    <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Check available hotels for {format(new Date(startDate), "dd MMM")} to {format(new Date(endDate), "dd MMM")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Free cancellation on most rooms</span>
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Genius member discounts available</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-muted-foreground">/ night</p>
                <p className="text-[10px] text-slate-400 mt-1">total · via Booking.com</p>
                <ExternalLink className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border leading-tight">
              Prices shown are indicative. Final price confirmed at booking. DheeVoy earns commission from partners — you pay nothing extra.
            </p>
          </Card>
        </a>
      </div>

      {(hotelOptions || []).length === 0 && (
        <div className="mb-6 p-4 bg-muted/30 border border-border rounded-2xl text-center">
          <p className="text-sm text-muted-foreground mb-3">Click the link below for finding suitable hotels.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a href={buildExpediaHotelSearchUrl(cityName, startDate, endDate, adults)} target="_blank" rel="noopener noreferrer"
               onClick={() => trackAffiliateClick({ partner_name: "Expedia Hotels", affiliate_link_id: null, context: "hotel", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}>
              <Button variant="outline" className="rounded-xl gap-1.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50">
                🏨 Search on Expedia Hotels <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </div>
        </div>
      )}
      <div className="space-y-3 mb-6">
        {(hotelOptions || []).map((h, i) => (
          <Card
            key={i}
            onClick={() => setSelectedHotel(i)}
            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedHotel === i ? "border-black shadow-lg" : "border-border hover:border-black/30"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm">{h.name}</p>
                <div className="flex items-center gap-1 mt-0.5 mb-2">
                  {Array.from({ length: h.stars || 3 }).map((_, s) => (
                    <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                  {h.rating && <span className="text-xs text-muted-foreground ml-1">{h.rating}/10</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{h.location_desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(h.amenities || []).slice(0, 4).map((a, ai) => (
                    <span key={ai} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-lg">{h.price_per_night}</p>
                <p className="text-xs text-muted-foreground">/ night</p>
                <p className="text-sm font-bold text-muted-foreground mt-1">{h.total_price}</p>
                <p className="text-[10px] text-slate-400">total · via {h.source}</p>
                {selectedHotel === i && <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 ml-auto" />}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border leading-tight">
              Prices shown are indicative. Final price confirmed at booking. DheeVoy earns commission from partners — you pay nothing extra.
            </p>
          </Card>
        ))}
      </div>

      {/* CJ affiliate tracking pixel for Booking.com */}
      <img src="https://www.lduhtrp.net/image-101812508-15734754" width="1" height="1" style={{display:"none"}} alt="" />

      {/* Things to do, Attractions & Tours — Viator + GetYourGuide affiliate section */}
      {(() => {
        const viatorLink = affiliateLinks.find(l => l.partner_name?.toLowerCase().includes("viator"));
        const gygLink = affiliateLinks.find(l => l.partner_name?.toLowerCase().includes("getyourguide"));
        return (
          <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-orange-600" /> Things to do, Attractions & Tours in {cityName}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Optional activities, attractions & experiences for your trip. Not part of flight/hotel booking.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {viatorLink && (
                <a href={viatorLink.affiliate_link} target="_blank" rel="noopener noreferrer"
                   onClick={() => trackAffiliateClick({ partner_name: "Viator", affiliate_link_id: viatorLink.id, context: "general", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}>
                  <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50">
                    🎟️ Browse on Viator <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              )}
              {gygLink && (
                <a href={gygLink.affiliate_link} target="_blank" rel="noopener noreferrer"
                   onClick={() => trackAffiliateClick({ partner_name: "GetYourGuide", affiliate_link_id: gygLink.id, context: "general", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}>
                  <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50">
                    🎟️ Browse on GetYourGuide <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        );
      })()}

      {/* Car Rentals — optional, separate from flight/hotel booking */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
          <Car className="w-4 h-4 text-blue-600" /> Car Rentals in {cityName}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Optional car hire for your trip. Not part of flight/hotel booking.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <a href="https://www.expedia.com/?siteid=1&langid=1033&clickref=1100lDbMvvrU&affcid=US.DIRECT.PHG.1100l430135.0&ref_id=1100lDbMvvrU&my_ad=AFF.US.DIRECT.PHG.1100l430135.0&afflid=1100lDbMvvrU&affdtl=PHG.1100lDbMvvrU.VPUxenLAiW" target="_blank" rel="noopener noreferrer"
             onClick={() => trackAffiliateClick({ partner_name: "Expedia Car Rentals", affiliate_link_id: null, context: "general", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}>
            <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
              🚗 Expedia Car Rentals <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
          <a href="https://getrentacar.tpo.lu/ElX9PBPd" target="_blank" rel="noopener noreferrer"
             onClick={() => trackAffiliateClick({ partner_name: "RentalCars", affiliate_link_id: null, context: "general", pillar: "PLAN", page: "FlightHotelPicker", destination: cityName })}>
            <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
              🚗 RentalCars <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </div>
      </div>

      {/* Cost calculator + booking links — shown only when both selected */}
      {canContinue && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          {/* Trip Cost Calculator */}
          <Card className="p-5 rounded-2xl border-border mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4" /> Your Trip Cost Calculator
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5" /> {flight.airline} {flight.flight_number}
                  <span className="text-xs bg-slate-100 px-1.5 rounded-full">×{adults}</span>
                </span>
                <span className="font-bold">{symbol}{flightTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Hotel className="w-3.5 h-3.5" /> {hotel.name} ({preferences.duration_days} nights)
                </span>
                <span className="font-bold">{hotel.total_price}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-base">
                <span className="font-bold">Flight + Hotel Total</span>
                <span className="text-xl font-black">{symbol}{grandTotal.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">Live prices on booking sites may differ slightly. Activities & visa fees not included here.</p>
            </div>
          </Card>

          {/* Booking links */}
          {/* Selected flight & hotel summary for reference */}
          <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-800 mb-1.5">✅ Your selection — book below:</p>
            <p>✈️ <span className="font-semibold">Flight:</span> {flight.airline} {flight.flight_number} · {flight.depart_airport} → {flight.arrive_airport} · {flight.depart_time?.split("T")[0]} at {flight.depart_time?.split("T")[1] || flight.depart_time}</p>
            <p>🏨 <span className="font-semibold">Hotel:</span> {hotel.name} · {preferences.duration_days} nights in {cityName}</p>
          </div>

          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-bold">Heads up:</span> Prices are live estimates from our search partners. Final price and availability are confirmed on the booking site.
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Book Now</p>
          <div className="space-y-2 mb-3">
            {(() => {
              const dest = destination?.city || destination?.name || "";
              return (<>
                {flight?.booking_url && (
                  <a href={flight.booking_url} target="_blank" rel="noopener noreferrer"
                     onClick={() => trackAffiliateClick({ partner_name: "Aviasales", affiliate_link_id: null, context: "flight", pillar: "PLAN", page: "FlightHotelPicker", destination: dest })}>
                    <Button className="w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700 gap-1.5 text-xs">
                      ✈️ Book This Flight on Aviasales <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                )}
                {hotel?.booking_url && (
                  <a href={hotel.booking_url} target="_blank" rel="noopener noreferrer"
                     onClick={() => trackAffiliateClick({ partner_name: "Hotellook", affiliate_link_id: null, context: "hotel", pillar: "PLAN", page: "FlightHotelPicker", destination: dest })}>
                    <Button variant="outline" className="w-full rounded-xl gap-1.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50">
                      🏨 Book This Hotel on Hotellook <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                )}
              </>);
            })()}
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        <Button
          size="lg"
          variant="outline"
          disabled={isSaving}
          onClick={onSaveDraft}
          className="w-full rounded-full gap-2 h-12 text-sm border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Trip for Later</>
          )}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground -mt-1">
          Saves your trip so you can access itinerary, activities & car rentals now — book flights/hotels later.
        </p>
        <Button
          size="lg"
          disabled={!canContinue || isSaving}
          onClick={() => onConfirm({ flight: flightOptions[selectedFlight], hotel: hotelOptions[selectedHotel] })}
          className="w-full rounded-full bg-black hover:bg-black/80 text-white gap-2 h-12 text-base disabled:opacity-40"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> I've Booked My Trip</>
          )}
        </Button>
        {!canContinue && (
          <p className="text-center text-xs text-muted-foreground">Select a flight and hotel above to confirm your booking</p>
        )}
      </div>

      {/* Continue to Travel Checklist — dark-theme restyled CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/30 p-5 mt-5 shadow-lg shadow-primary/5"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Now let's get you prepared</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Complete your Travel Checklist — visa, safety, weather, eSIM & insurance — before you travel.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={onContinueToChecklist}
          className="rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 w-full h-12 text-base font-bold"
        >
          <ClipboardList className="w-5 h-5" /> Continue to Travel Checklist <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* ── Booked Trip Popup — appears after user clicks "I've Booked My Trip" ── */}
      {bookedTripId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">🎉 Trip Booked!</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Your trip is saved. Now let's get you prepared — complete your Travel Checklist before you travel.
            </p>
            <Button
              size="lg"
              onClick={() => navigate(`/travel-checklist?trip=${bookedTripId}&path=self_planned`)}
              className="w-full rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-bold"
            >
              <ClipboardList className="w-5 h-5" />
              Continue to Travel Checklist
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}