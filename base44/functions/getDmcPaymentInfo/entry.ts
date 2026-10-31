import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns the DMC's direct-payment info (Revolut / PayPal / bank) for a published
// curated trip, so the customer checkout can show "Pay Ground Operator Directly"
// WITHOUT granting the customer read access to the DMC's private profile.
//
// SECURITY: Requires an authenticated user session — prevents anonymous web
// scraping of DMC payment links. Only payment-relevant fields are returned.
// Runs as service role to read the curated trip + DMC profile.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Auth: reject anonymous callers ──
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const curatedTripId = body?.curated_trip_id || body?.args?.curated_trip_id;
    if (!curatedTripId) return Response.json({ error: 'curated_trip_id required' }, { status: 400 });

    // Only published trips expose payment info
    const trip = await base44.asServiceRole.entities.curated_trips.get(curatedTripId);
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });
    if (!trip.published) return Response.json({ error: 'Trip not available' }, { status: 403 });

    if (!trip.dmc_profile_id) {
      return Response.json({ payment_info: null, reason: 'no_dmc_profile' });
    }

    const profile = await base44.asServiceRole.entities.DMCProfile.get(trip.dmc_profile_id);
    if (!profile) return Response.json({ payment_info: null, reason: 'no_dmc_profile' });

    // dmc_user_id = the DMC partner's user.id (profile.created_by_id) — needed so the
    // customer-created booking carries it for DMC-side RLS visibility.
    //
    // SECURITY (XSS defense-in-depth): only return payment links that are
    // strictly https:// URLs. A DMC could store a javascript:/data: URL via a
    // direct API call that bypasses the client-side form validation; this
    // server-side check ensures no unsafe scheme ever reaches the customer's
    // browser, regardless of what is stored. Unsafe values are blanked to null.
    const safeHttps = (v) => {
      const s = (v || "").trim();
      if (!s) return null;
      try {
        const u = new URL(s);
        return u.protocol === "https:" ? s : null;
      } catch {
        return null;
      }
    };
    return Response.json({
      payment_info: {
        business_name: profile.business_name || null,
        dmc_user_id: profile.created_by_id || null,
        revolut_payment_link: safeHttps(profile.revolut_payment_link),
        paypal_me_link: safeHttps(profile.paypal_me_link),
        bank_name: profile.bank_name || null,
        account_number: profile.account_number || null,
        swift_ifsc: profile.swift_ifsc || null,
        upi_id: profile.upi_id || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}