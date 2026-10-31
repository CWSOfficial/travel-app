import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// saveMultiCityTrip — saves a connected multi-city / multi-country journey as
// ONE parent Trip (journey_type = "multi_destination") plus N ordered
// TripSegment records keyed by trip_id. Does NOT touch the existing single-
// destination saveTrip flow. Ownership is forced server-side (user_id = the
// authenticated caller) exactly like saveTrip, so a client cannot reassign it.
//
// Payload:
//   trip_data: { departure_city, start_date, duration_days, budget,
//                travel_style, group_type, num_travelers, child_ages,
//                journey_pace, selected_destination, status }
//   segments:  [{ destination, destination_full, origin_city, arrival_date,
//                departure_date, nights, transport_type, transport_notes,
//                accommodation_name, segment_notes }]
//
// On update (trip_id provided): refreshes the parent Trip and upserts segments
// (re-creating segment rows for this trip_id so order/status stay consistent).
// Confirmed/completed segments are preserved if the caller marks them — we
// never delete segments whose segment_status is "completed".

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { trip_data, segments, trip_id } = body || {};
    if (!trip_data || !Array.isArray(segments) || segments.length < 2) {
      return Response.json({ error: "A multi-city trip needs at least 2 destinations." }, { status: 400 });
    }

    const forcedTripData = {
      ...trip_data,
      journey_type: "multi_destination",
      trip_type: trip_data.trip_type || "self_planned",
      user_id: user.id,
    };

    let parentTrip: any;
    if (trip_id) {
      // Verify ownership before asServiceRole update
      let existing: any;
      try {
        existing = await base44.asServiceRole.entities.Trip.get(trip_id);
      } catch {
        return Response.json({ error: "Trip not found" }, { status: 404 });
      }
      if (!existing || (existing.user_id !== user.id && existing.created_by_id !== user.id)) {
        return Response.json({ error: "You do not have permission to update this trip" }, { status: 403 });
      }
      const { user_id: _omit, created_by_id: _omit2, ...safe } = forcedTripData;
      parentTrip = await base44.asServiceRole.entities.Trip.update(trip_id, { ...safe, user_id: existing.user_id });

      // Replace non-completed segments for this trip; keep completed ones intact.
      const priorSegs = await base44.asServiceRole.entities.TripSegment.filter({ trip_id });
      const toDelete = priorSegs.filter((s) => s.segment_status !== "completed");
      for (const s of toDelete) {
        try { await base44.asServiceRole.entities.TripSegment.delete(s.id); } catch {}
      }
      const keptCompleted = priorSegs.filter((s) => s.segment_status === "completed");
      const newSegs = segments.filter((s) => !keptCompleted.some((k) => k.sequence_number === s.sequence_number));
      await createSegments(base44, parentTrip.id, user.id, newSegs, keptCompleted);
      return Response.json({ trip: parentTrip, created: false });
    }

    parentTrip = await base44.asServiceRole.entities.Trip.create(forcedTripData);
    await createSegments(base44, parentTrip.id, user.id, segments, []);

    // Log creation for monthly free-tier limit (same model as saveTrip)
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    try {
      await base44.asServiceRole.entities.TripSaveLog.create({ user_id: user.id, month_key: monthKey });
    } catch (e) {
      console.error("saveMultiCityTrip: log create failed:", (e as any)?.message);
    }

    return Response.json({ trip: parentTrip, created: true });
  } catch (error: any) {
    console.error("saveMultiCityTrip error:", error?.message);
    return Response.json({ error: error?.message || "internal_error" }, { status: 500 });
  }
}

async function createSegments(base44: any, tripId: string, userId: string, segments: any[], existingCompleted: any[]) {
  const rows = segments.map((s, i) => ({
    trip_id: tripId,
    user_id: userId,
    sequence_number: s.sequence_number != null ? s.sequence_number : i + 1,
    origin_city: s.origin_city || "",
    origin_country: s.origin_country || "",
    destination_city: s.destination_city || "",
    destination_country: s.destination_country || "",
    destination_country_code: s.destination_country_code || null,
    destination_lat: s.destination_lat != null ? Number(s.destination_lat) : null,
    destination_lng: s.destination_lng != null ? Number(s.destination_lng) : null,
    mapbox_place_id: s.mapbox_place_id || null,
    destination_full: s.destination_full || s.destination_city || "",
    arrival_date: s.arrival_date || null,
    departure_date: s.departure_date || null,
    nights: s.nights != null ? Number(s.nights) : null,
    transport_type: s.transport_type || null,
    transport_notes: s.transport_notes || null,
    accommodation_name: s.accommodation_name || null,
    accommodation_address: s.accommodation_address || null,
    segment_status: s.segment_status || "planned",
    itinerary_data: s.itinerary_data || null,
    segment_notes: s.segment_notes || null,
    // Additive fulfilment fields (nullable; reserved for future mix-and-match
    // fulfilment). Passed through unchanged when provided, null otherwise.
    fulfilment_type: s.fulfilment_type || null,
    dmc_partner_id: s.dmc_partner_id || null,
    dmc_package_id: s.dmc_package_id || null,
    booking_reference: s.booking_reference || null,
    booking_status: s.booking_status || null,
  }));
  if (rows.length) {
    await base44.asServiceRole.entities.TripSegment.bulkCreate(rows);
  }
}