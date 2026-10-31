import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Sanitise user-supplied content — strip ALL HTML tags, treat as plain text only
function stripHtml(str) {
  return String(str || '').replace(/<[^>]*>/g, '');
}

// ── HTML email template — dark navy + teal, matching app style ──
// All content pulled from real DB fields only — no LLM-generated facts.
function buildEmailHtml(trip, status) {
  const destination = stripHtml(trip.selected_destination || 'your destination');
  const budgetLabel = stripHtml((trip.budget || '').replace('_', ' ')) || '—';
  const departureCity = stripHtml(trip.departure_city || '—');
  const startDate = stripHtml(trip.start_date || '—');
  const durationDays = stripHtml(trip.duration_days || '—');
  const numTravelers = stripHtml(trip.num_travelers || 1);
  const isConfirmed = status === 'confirmed';
  const heading = isConfirmed ? 'Your trip is confirmed!' : 'Your trip draft has been saved!';
  const subheading = isConfirmed
    ? "You're all set — view your trip details below."
    : "Come back anytime to finalise your flights and hotels.";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="420" cellpadding="0" cellspacing="0" style="background-color:#1B2B5E;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.15);">
        <tr><td style="padding:32px 28px 16px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">✈️</div>
          <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;">${heading}</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">${subheading}</p>
        </td></tr>
        <tr><td style="padding:8px 28px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.06);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <tr><td style="padding:20px;">
              <p style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px;font-weight:600;">Trip Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Destination</td>
                  <td style="padding:6px 0;color:#00E5CC;font-size:13px;font-weight:700;text-align:right;">${destination}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Departing from</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;text-align:right;">${departureCity}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Start date</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;text-align:right;">${startDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Duration</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;text-align:right;">${durationDays} days</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Budget</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;text-align:right;text-transform:capitalize;">${budgetLabel}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Travellers</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;text-align:right;">${numTravelers}</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 28px 28px;text-align:center;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;line-height:1.6;">
            Safe travels,<br>The DheeVoy Team 🌍
          </p>
        </td></tr>
      </table>
      <p style="color:#94a3b8;font-size:10px;text-align:center;margin:16px 0 0;">
        AI-generated guidance — always verify independently before booking.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send email + create in-app notification (email only, no SMS) ──
async function sendTripNotification(base44, user, trip, status) {
  const destination = stripHtml(trip.selected_destination || 'your destination');
  const isConfirmed = status === 'confirmed';
  const subject = isConfirmed
    ? `✅ Trip to ${destination} confirmed!`
    : `💾 Trip to ${destination} saved!`;

  // 1) Email — HTML body built from real DB fields only
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      from_name: "DheeVoy by Dbuddy",
      subject,
      body: buildEmailHtml(trip, status),
    });
  } catch (e) {
    console.error("saveTrip: email send failed:", e.message || e);
  }

  // 2) In-app notification record
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_id: user.id,
      type: isConfirmed ? 'trip_confirmed' : 'trip_saved',
      title: isConfirmed ? `Trip to ${destination} confirmed!` : `Trip to ${destination} saved`,
      message: `${stripHtml(trip.departure_city || '—')} → ${destination} · ${stripHtml(trip.start_date || '—')} · ${stripHtml(trip.duration_days || '—')} days · ${stripHtml(trip.num_travelers || 1)} traveller(s)`,
      trip_id: trip.id,
      is_read: false,
    });
  } catch (e) {
    console.error("saveTrip: notification create failed:", e.message || e);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { trip_data, trip_id, check_only } = body;

    // Calendar-month key from SERVER UTC timestamp (not client time — can't be gamed)
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // Count creation logs this month — these persist even if trips are deleted
    const logs = await base44.asServiceRole.entities.TripSaveLog.filter({
      user_id: user.id,
      month_key: monthKey,
    });

    // ── CHECK ONLY: return quota without creating anything ──
    if (check_only) {
      return Response.json({
        trips_used: logs.length,
        limit: null,
        remaining: null,
        month_key: monthKey,
        limit_reached: false,
      });
    }

    // ── UPDATE existing trip (e.g. upgrading a draft to "confirmed") ──
    //    SECURITY: verify ownership before asServiceRole update (bypasses RLS)
    if (trip_id) {
      let existingTrip;
      try {
        existingTrip = await base44.asServiceRole.entities.Trip.get(trip_id);
      } catch (e) {
        return Response.json({ error: 'Trip not found' }, { status: 404 });
      }
      if (!existingTrip) {
        return Response.json({ error: 'Trip not found' }, { status: 404 });
      }
      if (existingTrip.user_id !== user.id && existingTrip.created_by_id !== user.id) {
        console.error(`[SECURITY] Unauthorized trip update attempt — trip_id: ${trip_id}, user: ${user.id}, timestamp: ${new Date().toISOString()}`);
        return Response.json({ error: 'You do not have permission to update this trip' }, { status: 403 });
      }

      // SECURITY: strip user_id from client payload so ownership can't be reassigned;
      // force it to the verified owner regardless of what the client sent.
      const { user_id: _clientUserId, created_by_id: _clientCreatedById, ...safeUpdateData } = trip_data || {};
      const updated = await base44.asServiceRole.entities.Trip.update(trip_id, {
        ...safeUpdateData,
        user_id: existingTrip.user_id,
      });

      // Fire notification only when status changes to confirmed
      if (trip_data.status === 'confirmed') {
        await sendTripNotification(base44, user, updated, 'confirmed');
      }

      return Response.json({ trip: updated, created: false });
    }

    const trip = await base44.asServiceRole.entities.Trip.create({
      ...trip_data,
      user_id: user.id,
    });

    // Log the creation — never deleted, so count survives trip deletion
    await base44.asServiceRole.entities.TripSaveLog.create({
      user_id: user.id,
      month_key: monthKey,
    });

    // Fire notification on both draft save and confirm
    const status = trip_data.status || 'planning';
    await sendTripNotification(base44, user, trip, status);

    return Response.json({ trip, created: true });
  } catch (error) {
    console.error("saveTrip error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});