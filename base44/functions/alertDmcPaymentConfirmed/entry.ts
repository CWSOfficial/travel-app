import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { adminPaymentConfirmedEmail } from '../../shared/emailTemplates.ts';

// Called by the DMC dashboard after a DMC clicks "Confirm Funds Received" and the
// booking status is set to "confirmed". Alerts all DheeVoy admin users via email
// AND an in-app Notification (dashboard alert).
//
// SECURITY: The caller must be the assigned DMC (booking.dmc_user_id) for that
// booking OR an Admin — otherwise 403. Admin email addresses are never exposed
// in the response payload (only aggregate counts are returned).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body?.booking_id || body?.args?.booking_id;
    if (!bookingId) return Response.json({ error: 'booking_id required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.CuratedTripBooking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    // ── Authorization: only the assigned DMC for this booking or an Admin ──
    const isAssignedDmc = !!booking.dmc_user_id && booking.dmc_user_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isAssignedDmc && !isAdmin) {
      return Response.json(
        { error: 'Forbidden — only the assigned DMC or an admin can confirm this booking' },
        { status: 403 }
      );
    }

    if (booking.status !== 'confirmed') {
      return Response.json({ skipped: 'booking not confirmed' });
    }

    // Alert every admin user via email + in-app notification.
    // Admin emails/ids are never returned in the response — only counts.
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 50);
    const adminList = Array.isArray(admins) ? admins : [];
    let emailFailures = 0;
    let notifFailures = 0;

    const subject = `✅ DMC Payment Confirmed — ${booking.trip_title || 'Curated Trip'}`;
    const APP_URL = 'https://dheevoytravel.base44.app';
    const emailHtml = adminPaymentConfirmedEmail({
      tripTitle: booking.trip_title || '—',
      dmcPartnerName: booking.dmc_partner_name || '—',
      customerName: booking.customer_name || '—',
      customerEmail: booking.customer_email || '—',
      amount: booking.amount || '—',
      bookingId: booking.id,
      appUrl: APP_URL,
    });

    for (const admin of adminList) {
      if (admin.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            from_name: 'DheeVoy DMC Portal',
            subject,
            html: emailHtml,
          });
        } catch (e) { emailFailures++; console.error('admin email send failed:', e.message); }
      }
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          type: 'dmc_payment_confirmed',
          title: 'DMC Payment Confirmed',
          message: `${booking.dmc_partner_name || 'A DMC partner'} confirmed funds for "${booking.trip_title || 'a curated trip'}".`,
          trip_id: booking.curated_trip_id,
          is_read: false,
        });
      } catch (e) { notifFailures++; console.error('admin notif create failed:', e.message); }
    }

    return Response.json({
      success: true,
      admins_alerted: adminList.length,
      email_failures: emailFailures,
      notif_failures: notifFailures,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}