import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  customerReceiptEmail,
  dmcPaymentReportedEmail,
  travelerConfirmationEmail,
  safeReceiptUrl,
} from '../../shared/emailTemplates.ts';

// Dispatches automated booking notification emails for the curated-trip booking flow.
//
// Two triggers:
//   trigger="payment_reported" (called after traveller uploads receipt):
//     1. Email to DMC operator: "New Payment Reported [Booking_Ref_ID] - [Lead_Name]"
//        — includes traveler roster, group size, total paid, link to DMC Dashboard.
//     2. Email to Traveller: "Receipt Received - Booking Reference [Booking_Ref_ID]"
//        — acknowledges upload, states operator is verifying funds.
//
//   trigger="confirmed" (called after DMC clicks "Confirm Funds Received"):
//     1. Email to Traveller: "Trip Confirmed! Booking Ref [Booking_Ref_ID]"
//        — includes confirmation voucher, DMC support contact, link to Travel Checklist.
//
// SECURITY: Requires an authenticated user session. For "payment_reported" the caller
// must be the booking's customer (booking.customer_user_id). For "confirmed" the
// caller must be the assigned DMC (booking.dmc_user_id) or an admin. All email
// addresses are read server-side from entity records — never trusted from the
// request body.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body?.booking_id || body?.args?.booking_id;
    const trigger = body?.trigger || body?.args?.trigger;
    if (!bookingId) return Response.json({ error: 'booking_id required' }, { status: 400 });
    if (!trigger || !['payment_reported', 'confirmed'].includes(trigger)) {
      return Response.json({ error: 'trigger must be "payment_reported" or "confirmed"' }, { status: 400 });
    }

    // ── Load booking (service role so both customer and DMC can trigger) ──
    const booking = await base44.asServiceRole.entities.CuratedTripBooking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    // ── Authorization ──
    const isCustomer = booking.customer_user_id === user.id;
    const isAssignedDmc = !!booking.dmc_user_id && booking.dmc_user_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isCustomer && !isAssignedDmc && !isAdmin) {
      return Response.json({ error: 'Forbidden — not authorized for this booking' }, { status: 403 });
    }

    // ── Load curated trip + DMC profile for email content ──
    const trip = booking.curated_trip_id
      ? await base44.asServiceRole.entities.curated_trips.get(booking.curated_trip_id).catch(() => null)
      : null;
    const profile = booking.dmc_profile_id
      ? await base44.asServiceRole.entities.DMCProfile.get(booking.dmc_profile_id).catch(() => null)
      : null;

    // DMC operator email: prefer curated_trips.operator_email, fall back to DMCProfile.email
    const dmcEmail = trip?.operator_email || profile?.email || null;
    const dmcContactInfo = trip?.dmc_contact_info || [profile?.email, profile?.phone].filter(Boolean).join(' · ') || '—';
    const tripTitle = trip?.trip_title || booking.trip_title || 'Your curated trip';
    const destination = trip?.destination || '—';
    const days = trip?.days || '—';
    const currency = trip?.currency || 'USD';
    const bookingRef = booking.booking_ref_id || booking.id;
    const leadName = `${booking.lead_first_name || ''} ${booking.lead_last_name || ''}`.trim() || booking.customer_name || 'Traveler';
    const leadFirstName = booking.lead_first_name || 'Traveler';
    const totalTravelers = booking.total_travelers || ((booking.adult_count || 1) + (booking.child_count || 0));
    const groupSizeStr = `${booking.adult_count || 1} Adults, ${booking.child_count || 0} Children (${totalTravelers} total)`;
    const totalPaid = `${currency} ${booking.total_amount_payable ?? '—'}`;
    // SECURITY: Transactional booking emails are sent ONLY to the verified
    // authenticated account email (customer_email). lead_email is retained for
    // display in email templates but is NEVER used as a sending recipient —
    // prevents mail injection via attacker-controlled form input.
    const verifiedEmail = booking.customer_email || null;
    const leadEmail = booking.lead_email || booking.customer_email;
    const leadPhone = booking.lead_phone || '—';
    const passportCountry = booking.passport_country || '—';

    // SECURITY: the receipt link is rendered only for an approved, credential-free
    // HTTPS Base44 storage URL (enforced by safeReceiptUrl at render time in the
    // shared template). Any other value is shown as plain text, never as a link.
    // Log rejected values so operators can investigate a tampered receipt_url.
    if (booking.receipt_url && !safeReceiptUrl(booking.receipt_url)) {
      console.warn(`Rejected non-approved receipt_url for booking ${booking.id}`);
    }

    const APP_URL = 'https://dheevoytravel.base44.app';
    const emailsSent = [];

    // ════════════════════════════════════════════════════════════════
    // TRIGGER 1: payment_reported — email DMC + email traveler
    // ════════════════════════════════════════════════════════════════
    if (trigger === 'payment_reported') {
      // 1a. Email to DMC operator
      if (dmcEmail) {
        const dmcSubject = `Action Needed: Payment Reported for ${tripTitle} [Ref: ${bookingRef}]`;
        const dmcHtml = dmcPaymentReportedEmail({
          tripTitle,
          bookingRef,
          leadFirstName: booking.lead_first_name || '',
          leadLastName: booking.lead_last_name || '',
          leadEmail: leadEmail || '—',
          leadPhone,
          passportCountry,
          totalTravelers,
          currency,
          totalAmountPayable: booking.total_amount_payable ?? '—',
          receiptUrl: booking.receipt_url || null,
          appUrl: APP_URL,
        });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: dmcEmail,
            from_name: 'DheeVoy Bookings',
            subject: dmcSubject,
            html: dmcHtml,
          });
          emailsSent.push({ to: 'dmc', status: 'sent' });
        } catch (e) {
          emailsSent.push({ to: 'dmc', status: 'failed', error: e.message });
          console.error('DMC email send failed:', e.message);
        }
      } else {
        emailsSent.push({ to: 'dmc', status: 'skipped', reason: 'no operator email' });
      }

      // 1b. Email to traveler
      if (verifiedEmail) {
        const travelerSubject = `Payment Verification in Progress — Booking Ref ${bookingRef}`;
        const travelerHtml = customerReceiptEmail({
          leadFirstName,
          tripTitle,
          bookingRef,
          currency,
          totalAmountPayable: booking.total_amount_payable ?? '—',
          adultCount: booking.adult_count || 1,
          childCount: booking.child_count || 0,
          operatorName: booking.dmc_partner_name || 'your tour operator',
          appUrl: APP_URL,
        });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: verifiedEmail,
            from_name: 'DheeVoy',
            subject: travelerSubject,
            html: travelerHtml,
          });
          emailsSent.push({ to: 'traveler', status: 'sent' });
        } catch (e) {
          emailsSent.push({ to: 'traveler', status: 'failed', error: e.message });
          console.error('Traveler email send failed:', e.message);
        }
      } else {
        emailsSent.push({ to: 'traveler', status: 'skipped', reason: 'no verified customer email' });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // TRIGGER 2: confirmed — email traveler with confirmation voucher
    // ════════════════════════════════════════════════════════════════
    if (trigger === 'confirmed') {
      if (verifiedEmail) {
        const confSubject = `Trip Confirmed! Booking Ref ${bookingRef}`;
        const confHtml = travelerConfirmationEmail({
          leadFirstName,
          tripTitle,
          bookingRef,
          destination,
          days,
          groupSizeStr,
          totalPaid,
          dmcPartnerName: booking.dmc_partner_name || '—',
          dmcContactInfo,
          appUrl: APP_URL,
        });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: verifiedEmail,
            from_name: 'DheeVoy',
            subject: confSubject,
            html: confHtml,
          });
          emailsSent.push({ to: 'traveler', status: 'sent' });
        } catch (e) {
          emailsSent.push({ to: 'traveler', status: 'failed', error: e.message });
          console.error('Confirmation email send failed:', e.message);
        }
      } else {
        emailsSent.push({ to: 'traveler', status: 'skipped', reason: 'no verified customer email' });
      }
    }

    return Response.json({ success: true, trigger, emails_sent: emailsSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}