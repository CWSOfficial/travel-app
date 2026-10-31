// Segment-aware booking context builder for the Multi-City Journey Engine.
// "Plan once. Reuse the journey context everywhere."
//
// Builds a reusable context object from Trip + TripSegment so hotel, flight,
// transport, activities, car rental, and curated-trip matching never need to
// re-ask the user for destination, dates, or traveller counts that are already
// stored reliably in the Trip or TripSegment records.

import { splitLocation } from "@/lib/journeyContext";

// Build booking context for ONE segment (hotels, things to do, car rental).
export const buildSegmentBookingContext = ({ trip, segment, prevSegment, nextSegment }) => {
  const seg = segment || {};
  const prev = prevSegment || {};
  const destFull = seg.destination_full || seg.destination_city || seg.destination || "";
  const { city: destCity, country: destCountry } = splitLocation(destFull);
  const prevFull = prev.destination_full || prev.destination_city || prev.destination || "";
  const { city: originCity } = splitLocation(prevFull);

  const adults = Number(trip?.num_travelers || trip?.adults || 1);
  const children = Number(trip?.children || 0);
  const childAges = Array.isArray(trip?.child_ages) ? trip.child_ages : [];

  return {
    trip_id: trip?.id || null,
    segment_id: seg.id || null,
    sequence_number: seg.sequence_number || null,
    origin: originCity || trip?.departure_city || "",
    destination: destCity || "",
    destination_full: destFull,
    destination_country: destCountry || "",
    arrival_date: seg.arrival_date || "",
    departure_date: seg.departure_date || "",
    nights: seg.nights != null ? seg.nights : null,
    transport_type: seg.transport_type || null,
    adults,
    children,
    child_ages: childAges,
    total_travelers: adults + children,
    group_type: trip?.group_type || "",
    budget: trip?.budget || "",
    travel_style: trip?.travel_style || "",
    next_destination: nextSegment
      ? splitLocation(nextSegment.destination_full || nextSegment.destination_city || "").city
      : "",
  };
};

// Build booking context for a TRANSFER leg between two consecutive segments
// (flights / transport). Uses the previous segment's departure date as the
// travel date and the next segment's transport_type as the preferred mode.
export const buildTransferContext = ({ trip, fromSegment, toSegment }) => {
  const fromFull = fromSegment?.destination_full || fromSegment?.destination_city || fromSegment?.destination || "";
  const toFull = toSegment?.destination_full || toSegment?.destination_city || toSegment?.destination || "";
  const { city: fromCity } = splitLocation(fromFull);
  const { city: toCity } = splitLocation(toFull);

  const adults = Number(trip?.num_travelers || trip?.adults || 1);
  const children = Number(trip?.children || 0);
  const childAges = Array.isArray(trip?.child_ages) ? trip.child_ages : [];

  return {
    trip_id: trip?.id || null,
    from_segment_id: fromSegment?.id || null,
    to_segment_id: toSegment?.id || null,
    origin: fromCity || trip?.departure_city || "",
    destination: toCity || "",
    travel_date: fromSegment?.departure_date || toSegment?.arrival_date || "",
    transport_type: toSegment?.transport_type || "flight",
    adults,
    children,
    child_ages: childAges,
    total_travelers: adults + children,
    return_date: "",
  };
};

// Serialize a booking context into URL search params for passing to existing
// DheeVoy pages that consume query params (e.g. /flights-hotels, /attractions).
export const bookingContextToQuery = (ctx) => {
  const p = new URLSearchParams();
  if (!ctx) return p.toString();
  if (ctx.destination) p.set("destination", ctx.destination);
  if (ctx.destination_full) p.set("dest_full", ctx.destination_full);
  if (ctx.origin) p.set("origin", ctx.origin);
  if (ctx.arrival_date) p.set("checkin", ctx.arrival_date);
  if (ctx.departure_date) p.set("checkout", ctx.departure_date);
  if (ctx.travel_date) p.set("travel_date", ctx.travel_date);
  if (ctx.adults) p.set("adults", String(ctx.adults));
  if (ctx.children) p.set("children", String(ctx.children));
  if (ctx.total_travelers) p.set("travelers", String(ctx.total_travelers));
  if (ctx.trip_id) p.set("trip_id", ctx.trip_id);
  if (ctx.segment_id) p.set("segment_id", ctx.segment_id);
  if (ctx.transport_type) p.set("transport", ctx.transport_type);
  return p.toString();
};