import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bed, Ticket, Plane, Car, Map, ChevronDown, ChevronRight, ExternalLink, Sparkles, Package, Smartphone } from "lucide-react";
import { buildSegmentBookingContext, buildTransferContext } from "@/lib/bookingContext";
import { buildExpediaHotelSearchUrl } from "@/lib/hotelAffiliateLinks";
import { buildAviasalesSearchUrl } from "@/lib/aviasalesUrl";
import { trackAffiliateClick } from "@/lib/trackAffiliateClick";
import { destinationSlug } from "@/lib/affiliateDeepLink";
import { splitLocation } from "@/lib/journeyContext";
import { matchCuratedPackagesForSegment } from "@/lib/curatedPackageMatch";
import { base44 } from "@/api/base44Client";
import posthog from "posthog-js";

// Segment-aware booking actions — "Book by destination".
// Reuses Trip + TripSegment context so the user never re-enters destination,
// dates, or traveller counts. Builds direct affiliate deep links instead of
// sending users to a generic chatbot that re-asks everything.
//
// Layout: per-segment cards (Hotels, Things To Do, Curated Packages if real
// matches exist) with transport legs between segments (Flights / Transport).
// Collapsible per segment so users aren't overwhelmed.

const ESIM_AFFILIATE_URL = "https://cellesim.com/r/dheevoy-limited-rze";
const buildEsimLink = (destination) =>
  `${ESIM_AFFILIATE_URL}?destination=${destinationSlug(destination)}`;

const VIATOR_BASE = "https://www.viator.com/searchResults/all?text=";
const GYG_BASE = "https://www.getyourguide.com/s/?q=";
const CAR_RENTAL_LINK =
  "https://getrentacar.com/?track_id=d8d3801cb6564274bc934857c-738679&utm_campaign=partner&utm_medium=partner_cpa&utm_source=travelpayouts";

const buildThingsToDoLink = (destination) =>
  `${VIATOR_BASE}${encodeURIComponent(destination)}&pid=P00310889&mcid=42383&medium=link`;

const buildActivitiesLink = (destination) =>
  `${GYG_BASE}${encodeURIComponent(destination)}&partner_id=YIJSN5X&cmp=short-url`;

const trackClick = (partner, ctx, kind) => {
  trackAffiliateClick({
    partner_name: partner,
    context: kind,
    page: "SegmentBookingActions",
    destination: ctx?.destination || ctx?.origin,
    pillar: "PLAN",
  });
  posthog.capture("journey_booking_action_clicked", {
    partner,
    kind,
    segment: ctx?.sequence_number,
    destination: ctx?.destination,
  });
};

export default function SegmentBookingActions({ journey, trip, segments }) {
  const [openSeg, setOpenSeg] = useState(0);
  const [curatedTrips, setCuratedTrips] = useState([]);
  const [matchMap, setMatchMap] = useState({});

  // Load published curated trips once, then match against each segment.
  useEffect(() => {
    (async () => {
      try {
        const pkgs = await base44.entities.curated_trips.filter({ published: true }, "-updated_date", 50);
        setCuratedTrips(pkgs || []);
      } catch {
        setCuratedTrips([]);
      }
    })();
  }, []);

  // Build match map: segmentIndex → ranked curated matches
  useEffect(() => {
    if (!curatedTrips.length || !segments?.length) return;
    const travellers = journey?.travellers || {};
    const map = {};
    segments.forEach((seg, i) => {
      const matches = matchCuratedPackagesForSegment(curatedTrips, seg, travellers);
      if (matches.length) map[i] = matches.slice(0, 1); // only top match, only if real
    });
    setMatchMap(map);
  }, [curatedTrips, segments, journey?.travellers]);

  if (!segments || segments.length === 0) return null;

  const ordered = [...segments].sort((a, b) => a.sequence_number - b.sequence_number);

  // Journey-level eSIM: unique destination countries for the "Stay connected" banner
  const allDestCountries = [...new Set(
    ordered.map((s) => splitLocation(s.destination_full || s.destination_city || s.destination || "").country).filter(Boolean)
  )];
  const journeyDestLabel = allDestCountries.length > 3
    ? `${allDestCountries.slice(0, 3).join(", ")} +${allDestCountries.length - 3} more`
    : allDestCountries.join(", ") || "your destinations";
  const firstDestination = ordered[0]?.destination_full || ordered[0]?.destination_city || ordered[0]?.destination || "";

  const tripObj = trip || { id: null, num_travelers: journey?.travellers?.num_travelers, group_type: journey?.travellers?.group_type, budget: journey?.travellers?.budget, travel_style: journey?.travellers?.travel_style, child_ages: journey?.travellers?.child_ages, departure_city: journey?.startCity };

  return (
    <div className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-teal-400" /> Book by destination
      </p>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Your trip details are pre-filled. Pick a stop to book hotels, activities, or transport.
      </p>

      {/* Journey-level eSIM — "Stay connected across your journey" */}
      {firstDestination && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/25 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-teal-300" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">Stay connected across your journey</p>
            <p className="text-[10px] text-slate-400 truncate">eSIM data plans for {journeyDestLabel}</p>
          </div>
          <a
            href={buildEsimLink(firstDestination)}
            target="_blank"
            rel="nofollow sponsored"
            onClick={() => trackClick("Cellesim eSIM", { destination: firstDestination }, "general")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-300 hover:text-teal-200 border border-teal-500/25 bg-teal-500/10 rounded-lg px-2.5 py-1.5 shrink-0 min-h-[32px]"
          >
            Get eSIM <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="space-y-2">
        {ordered.map((seg, i) => {
          const isOpen = openSeg === i;
          const prevSeg = i > 0 ? ordered[i - 1] : null;
          const nextSeg = i < ordered.length - 1 ? ordered[i + 1] : null;
          const ctx = buildSegmentBookingContext({ trip: tripObj, segment: seg, prevSegment: prevSeg, nextSegment: nextSeg });
          const destFull = seg.destination_full || seg.destination_city || seg.destination;
          const curatedMatch = matchMap[i]?.[0];
          const adults = ctx.adults || 1;

          return (
            <div key={seg.id || i}>
              {/* Transfer leg before this segment (except first) */}
              {i > 0 && (
                <TransferLeg
                  trip={tripObj}
                  fromSegment={prevSeg}
                  toSegment={seg}
                />
              )}

              {/* Segment booking card */}
              <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <button
                  onClick={() => setOpenSeg(isOpen ? -1 : i)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors min-h-[48px]"
                >
                  <span className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {seg.sequence_number || i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{destFull}</p>
                    <p className="text-[11px] text-slate-400">
                      {seg.arrival_date ? seg.arrival_date : ""}
                      {seg.departure_date ? ` → ${seg.departure_date}` : ""}
                      {ctx.nights != null ? ` · ${ctx.nights}n` : ""}
                      {` · ${ctx.total_travelers} traveller${ctx.total_travelers !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/10">
                        {/* Hotels */}
                        <BookingRow
                          icon={Bed}
                          label="Hotels"
                          href={buildExpediaHotelSearchUrl(ctx.destination_full || ctx.destination, ctx.arrival_date, ctx.departure_date, adults)}
                          onClick={() => trackClick("Expedia (Hotels)", ctx, "hotel")}
                          sub={`${ctx.arrival_date || "flexible"} – ${ctx.departure_date || "flexible"} · ${adults} adult${adults !== 1 ? "s" : ""}`}
                        />

                        {/* Things to Do — two providers */}
                        <BookingRow
                          icon={Ticket}
                          label="Things to Do"
                          href={buildThingsToDoLink(ctx.destination_full || ctx.destination)}
                          onClick={() => trackClick("Viator", ctx, "general")}
                          sub="Tours & tickets"
                        />
                        <BookingRow
                          icon={Ticket}
                          label="Activities"
                          href={buildActivitiesLink(ctx.destination_full || ctx.destination)}
                          onClick={() => trackClick("GetYourGuide", ctx, "general")}
                          sub="Curated experiences"
                        />

                        {/* Car Rental */}
                        <BookingRow
                          icon={Car}
                          label="Car Rental"
                          href={CAR_RENTAL_LINK}
                          onClick={() => trackClick("GetRentACar", ctx, "general")}
                          sub="Pickup at destination"
                        />

                        {/* eSIM */}
                        <BookingRow
                          icon={Smartphone}
                          label="eSIM"
                          href={buildEsimLink(ctx.destination_full || ctx.destination)}
                          onClick={() => trackClick("Cellesim eSIM", ctx, "general")}
                          sub="Stay connected abroad"
                        />

                        {/* Curated DMC package — only if a real match exists */}
                        {curatedMatch && (
                          <div className="rounded-lg border border-teal-500/20 bg-teal-500/10 p-2.5 space-y-1.5">
                            <p className="text-[11px] font-semibold text-teal-300 inline-flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" /> Prefer a local expert package?
                            </p>
                            <a
                              href={`#/curated-trips/${curatedMatch.package.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                trackClick("CuratedTrip", ctx, "general");
                                window.location.hash = `#/curated-trips/${curatedMatch.package.id}`;
                              }}
                              className="block rounded-lg border border-teal-500/25 bg-white/5 hover:bg-white/10 p-2 transition-colors"
                            >
                              <p className="text-xs font-semibold text-white">{curatedMatch.package.trip_title}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {curatedMatch.package.destination} · {curatedMatch.package.days}d
                                {curatedMatch.package.price_display ? ` · ${curatedMatch.package.price_display}` : ""}
                              </p>
                            </a>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Booking links open existing DheeVoy partner flows with your trip details pre-filled. No new bookings are created here.
      </p>
    </div>
  );
}

// ── Transfer leg between two segments ──
function TransferLeg({ trip, fromSegment, toSegment }) {
  const ctx = buildTransferContext({ trip, fromSegment, toSegment });
  const fromCity = ctx.origin;
  const toCity = ctx.destination;

  return (
    <div className="flex items-center gap-2 py-1.5 px-1">
      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1.5 flex-1 min-w-0">
        <Plane className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="truncate">
          <span className="text-slate-300">{fromCity}</span>
          <span className="text-slate-600 mx-1">→</span>
          <span className="text-slate-300">{toCity}</span>
        </span>
        <span className="text-slate-500 shrink-0">{ctx.travel_date}</span>
      </span>
      <a
        href={buildAviasalesSearchUrl(fromCity, toCity, ctx.travel_date, "")}
        target="_blank"
        rel="nofollow sponsored"
        onClick={() => trackClick("Aviasales", ctx, "flight")}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-300 hover:text-teal-200 border border-teal-500/25 bg-teal-500/10 rounded-lg px-2.5 py-1.5 shrink-0 min-h-[32px]"
      >
        Flights <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ── Reusable booking action row ──
function BookingRow({ icon: Icon, label, href, onClick, sub }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 hover:border-teal-500/30 hover:bg-white/10 transition-colors p-2.5 text-left min-h-[44px]"
    >
      <span className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-teal-300" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>}
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    </a>
  );
}