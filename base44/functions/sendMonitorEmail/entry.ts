import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled daily automation — sends trip monitor emails to ALL premium users with active/upcoming trips
// SECURITY: requires x-internal-secret header (or body.args.internal_secret for scheduled automation)
// matching INTERNAL_FUNCTION_SECRET env var. Prevents unauthorized external calls.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Security gate: verify internal secret before any logic runs ──
    // Accepts: x-internal-secret header (manual/admin calls)
    //       OR body.args.internal_secret (scheduled automation function_args)
    //       OR an authenticated platform request (scheduler includes platform auth)
    const expectedSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
    const headerSecret = req.headers.get('x-internal-secret');
    const body = await req.json().catch(() => ({}));
    const bodySecret = body?.args?.internal_secret || body?.internal_secret;

    const secretMatch = expectedSecret && (headerSecret === expectedSecret || bodySecret === expectedSecret);

    // Only allow: correct secret OR authenticated admin — NOT any logged-in user
    let isAdmin = false;
    if (!secretMatch) {
      const isAuthed = await base44.auth.isAuthenticated();
      if (isAuthed) {
        const user = await base44.auth.me();
        isAdmin = user?.role === 'admin';
      }
    }

    if (!secretMatch && !isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all confirmed/booked trips that have an email
    const allTrips = await base44.asServiceRole.entities.Trip.filter({ status: 'booked' }, '-start_date', 100);
    const confirmedTrips = await base44.asServiceRole.entities.Trip.filter({ status: 'confirmed' }, '-start_date', 100);
    const trips = [...allTrips, ...confirmedTrips].filter(t => t.user_id && t.selected_destination);

    const today = new Date();
    const results = [];

    for (const trip of trips) {
      // Only monitor trips within 7 days before departure through end of trip
      const startDate = new Date(trip.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (trip.duration_days || 7));
      const daysUntilStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilStart > 7 || today > endDate) {
        results.push({ trip: trip.selected_destination, skipped: 'outside monitor window' });
        continue;
      }

      const endDateStr = endDate.toISOString().split('T')[0];

    // Generate live monitoring update via AI
    const monitorResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Dbuddy AI monitoring system. Provide a brief travel monitor update for:
Destination: ${trip.selected_destination}
Dates: ${trip.start_date} to ${endDateStr}
Today: ${new Date().toISOString().split('T')[0]}

Return: safety_alert (level: ok/warning/critical, title, message), weather (current, forecast), today_tip (1 sentence)`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          safety_alert: {
            type: "object",
            properties: {
              level: { type: "string" },
              title: { type: "string" },
              message: { type: "string" }
            }
          },
          weather: {
            type: "object",
            properties: { current: { type: "string" }, forecast: { type: "string" } }
          },
          today_tip: { type: "string" }
        }
      }
    });

    const safetyEmoji = monitorResult.safety_alert?.level === 'critical' ? '🔴' : monitorResult.safety_alert?.level === 'warning' ? '🟡' : '🟢';

      // SECURITY: recipient email comes ONLY from the authenticated user's own account record
      // — never from trip.email (user-supplied input) or URL parameters
      const verifiedEmail = tripUser?.email;
      if (!verifiedEmail) {
        results.push({ trip: trip.selected_destination, skipped: 'no verified email on user account' });
        continue;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: verifiedEmail,
        from_name: "DheeVoy Monitor",
        subject: `${safetyEmoji} Trip Monitor: ${trip.selected_destination} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        body: `Hi there,

Here's your daily Dbuddy AI trip monitor update for ${trip.selected_destination}.

🛡️ SAFETY: ${monitorResult.safety_alert?.title || 'All Clear'}
${monitorResult.safety_alert?.message || 'No advisories at this time.'}

🌤️ WEATHER: ${monitorResult.weather?.current || 'N/A'}
Forecast: ${monitorResult.weather?.forecast || 'N/A'}

💡 DBUDDY TIP: ${monitorResult.today_tip || 'Have a wonderful trip!'}

---
Trip: ${trip.departure_city} → ${trip.selected_destination}
Dates: ${trip.start_date} – ${endDateStr} (${trip.duration_days} days)

Open the DheeVoy app for full live monitoring.

Safe travels,
Dbuddy AI — DheeVoy 🌍

─────────────────────────────
This is a premium monitoring alert. Manage preferences in your DheeVoy profile.`
      });

      results.push({ trip: trip.selected_destination, sent_to: verifiedEmail });
    }

    return Response.json({ success: true, processed: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});