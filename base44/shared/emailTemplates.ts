// ─────────────────────────────────────────────────────────────────────
// DheeVoy Enterprise Email Templates
// Shared responsive HTML email builders for booking notification emails.
// All templates use inline CSS + table layout for max email-client compat.
//
// SECURITY MODEL
//   • Every dynamic (user/client-controlled) value is HTML-escaped at the
//     exact point of interpolation via escapeHtml(). Markup is 100%
//     server-defined — raw booking values are never concatenated into HTML.
//   • Receipt links are validated with safeReceiptUrl() so only approved
//     Base44 storage URLs (as returned by UploadPublicFile) can ever be
//     rendered as a clickable link.
// ─────────────────────────────────────────────────────────────────────

const BRAND = "DheeVoy";
const SUPPORT_EMAIL = "support@dheevoy.com";
const PRIMARY = "#2DD4BF"; // cyan/teal accent
const BG_DARK = "#0F172A"; // slate-900
const CARD_BG = "#1E293B"; // slate-800
const TEXT_LIGHT = "#F8FAFC"; // slate-50
const TEXT_MUTED = "#94A3B8"; // slate-400
const BORDER = "#334155"; // slate-700
const AMBER = "#F59E0B";
const AMBER_BG = "#78350F";
const RED = "#EF4444";
const RED_BG = "#7F1D1D";

// ═══════════════════════════════════════════════════════════════════
// SECURITY UTILITIES
// ═══════════════════════════════════════════════════════════════════

// Escapes the five HTML-significant characters so user-controlled values can
// never inject markup, links, attributes, styles, buttons, or scripts into an
// email body. Apply at every interpolation point that receives dynamic data.
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Approved Base44 storage hosts for uploaded files (UploadPublicFile).
// Exact-host matching only — never wildcard subdomains.
const APPROVED_RECEIPT_HOSTS = new Set(["base44.app", "media.base44.com"]);

// Returns a normalized URL only when it is a credential-free HTTPS URL on an
// approved Base44 storage host; otherwise null. Prevents any arbitrary
// external URL supplied via the booking entity from being rendered as a link.
export function safeReceiptUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!APPROVED_RECEIPT_HOSTS.has(host)) return null;
  return url.toString();
}

// ── Global wrapper: 600px centered, dark slate, brand header + footer ──
function wrapper(innerHtml: string, preheader: string = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
${preheader ? `<title>${escapeHtml(preheader)}</title>` : ""}
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0B1120;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${BG_DARK};border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
          <!-- ── Brand Header (logo on white chip + tagline) ── -->
          <tr>
            <td style="padding:28px 32px 10px;text-align:center;background-color:${BG_DARK};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#ffffff;border-radius:10px;padding:8px 16px;">
                    <img src="https://media.base44.com/images/public/6a1efd8ea4ce97ed07891b4b/da9458bfa_DheeVoyLogo.png" alt="DheeVoy" height="40" style="display:block;border:0;max-width:170px;height:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${PRIMARY};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Plan smarter &bull; Travel safer &bull; Go further.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 24px;text-align:center;">
              <div style="height:2px;width:64px;background-color:${PRIMARY};margin:0 auto;border-radius:2px;"></div>
            </td>
          </tr>
          <!-- ── Content ── -->
          <tr>
            <td style="padding:0 32px 32px;">
              ${innerHtml}
            </td>
          </tr>
          <!-- ── Footer ── -->
          <tr>
            <td style="padding:24px 32px;background-color:#0B1120;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${TEXT_LIGHT};text-align:center;">${escapeHtml(BRAND)} Travel Platform</p>
              <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};text-align:center;">
                Need help? <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${PRIMARY};text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a>
              </p>
              <p style="margin:0 0 6px;font-size:11px;color:${TEXT_MUTED};text-align:center;line-height:1.5;">
                You receive this email because you booked a trip through DheeVoy.
                We process your data in line with our Privacy Policy (ICO registered).
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:${TEXT_MUTED};text-align:center;">
                &copy; ${new Date().getFullYear()} DheeVoy. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
</body>
</html>`;
}

// ── Status badge (text is static/server-defined; escaped regardless) ──
function badge(text: string, bg: string, fg: string): string {
  return `
  <div style="display:inline-block;padding:8px 18px;background-color:${bg};color:${fg};border-radius:999px;font-size:13px;font-weight:700;margin-bottom:20px;">
    ${escapeHtml(text)}
  </div>`;
}

// ── Salutation ──
function salutation(name: string): string {
  return `<p style="margin:0 0 20px;font-size:16px;color:${TEXT_LIGHT};line-height:1.5;">Hi ${escapeHtml(name)},</p>`;
}

// ── Info table row ──
function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_MUTED};width:45%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_LIGHT};font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`;
}

// ── Primary CTA button ──
function ctaButton(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
    <tr>
      <td style="border-radius:999px;background-color:${PRIMARY};">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#0F172A;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

// ── Section heading ──
function heading(text: string): string {
  return `<p style="margin:24px 0 12px;font-size:15px;font-weight:700;color:${TEXT_LIGHT};">${escapeHtml(text)}</p>`;
}

// ═════════════════════════════════════════════════════════════════════
// TEMPLATE 1: Customer Receipt Uploaded (payment_reported → traveler)
// ═════════════════════════════════════════════════════════════════════
export function customerReceiptEmail(d: {
  leadFirstName: string;
  tripTitle: string;
  bookingRef: string;
  currency: string;
  totalAmountPayable: string | number;
  adultCount: number;
  childCount: number;
  operatorName: string;
  appUrl: string;
}): string {
  const inner = `
${badge("⏳ Payment Verification in Progress", AMBER_BG, AMBER)}
${salutation(d.leadFirstName)}
<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
  We've received your payment receipt for <strong style="color:${TEXT_LIGHT};">${escapeHtml(d.tripTitle)}</strong>. Your tour operator is now verifying the funds.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
  ${infoRow("Trip Name", d.tripTitle)}
  ${infoRow("Booking Reference", d.bookingRef)}
  ${infoRow("Total Amount Paid", `${d.currency} ${d.totalAmountPayable}`)}
  ${infoRow("Group Composition", `${d.adultCount} Adults, ${d.childCount} Children`)}
</table>
${heading("Next Steps")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
  <tr>
    <td style="padding:0 0 12px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
      <span style="color:${PRIMARY};font-weight:700;">1.</span> Tour operator <strong style="color:${TEXT_LIGHT};">${escapeHtml(d.operatorName)}</strong> is matching your receipt with bank records.
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 12px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
      <span style="color:${PRIMARY};font-weight:700;">2.</span> Your confirmation voucher will be emailed within <strong style="color:${TEXT_LIGHT};">12–24 hours</strong>.
    </td>
  </tr>
</table>
${ctaButton("Prepare Your Travel Checklist", `${d.appUrl}/prepare`)}
`;
  return wrapper(inner, "Payment Verification in Progress");
}

// ═════════════════════════════════════════════════════════════════════
// TEMPLATE 2: DMC Action Required (payment_reported → DMC operator)
// ═════════════════════════════════════════════════════════════════════
export function dmcPaymentReportedEmail(d: {
  tripTitle: string;
  bookingRef: string;
  leadFirstName: string;
  leadLastName: string;
  leadEmail: string;
  leadPhone: string;
  passportCountry: string;
  totalTravelers: number;
  currency: string;
  totalAmountPayable: string | number;
  receiptUrl: string | null;
  appUrl: string;
}): string {
  const leadFull = `${d.leadFirstName} ${d.leadLastName}`.trim();

  // SECURITY: only an approved, credential-free HTTPS Base44 storage URL may
  // become a clickable link. Anything else is never rendered as a link.
  const safeReceipt = safeReceiptUrl(d.receiptUrl);
  const receiptLink = safeReceipt
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${CARD_BG};border-radius:12px;border:1px solid ${BORDER};margin:16px 0;">
        <tr>
          <td style="padding:16px;text-align:center;">
            <p style="margin:0 0 12px;font-size:12px;color:${TEXT_MUTED};">Uploaded Payment Receipt</p>
            <a href="${escapeHtml(safeReceipt)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:700;color:${PRIMARY};text-decoration:none;border:1px solid ${PRIMARY};border-radius:999px;">📎 View Receipt File</a>
          </td>
        </tr>
      </table>`
    : d.receiptUrl
      ? `<p style="margin:12px 0;font-size:13px;color:${TEXT_MUTED};font-style:italic;">Receipt file unavailable — please verify in the DMC portal.</p>`
      : `<p style="margin:12px 0;font-size:13px;color:${TEXT_MUTED};font-style:italic;">No receipt file was uploaded.</p>`;

  const inner = `
${badge("🚨 Action Required: New Payment Reported", RED_BG, RED)}
<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
  A traveler has reported a payment for <strong style="color:${TEXT_LIGHT};">${escapeHtml(d.tripTitle)}</strong>. Please verify the funds and confirm the booking.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
  ${infoRow("Lead Booker", leadFull)}
  ${infoRow("Email", d.leadEmail || "—")}
  ${infoRow("Phone", d.leadPhone || "—")}
  ${infoRow("Passport Country", d.passportCountry)}
  ${infoRow("Total Travelers", String(d.totalTravelers))}
  ${infoRow("Reported Payment", `${d.currency} ${d.totalAmountPayable}`)}
  ${infoRow("Booking Reference", d.bookingRef)}
</table>
${receiptLink}
${ctaButton("Open DMC Portal & Confirm Booking", `${d.appUrl}/dmc/dashboard`)}
`;
  return wrapper(inner, "Action Required: New Payment Reported");
}

// ═════════════════════════════════════════════════════════════════════
// TEMPLATE 3: Traveler Confirmation Voucher (confirmed → traveler)
// ═════════════════════════════════════════════════════════════════════
export function travelerConfirmationEmail(d: {
  leadFirstName: string;
  tripTitle: string;
  bookingRef: string;
  destination: string;
  days: string | number;
  groupSizeStr: string;
  totalPaid: string;
  dmcPartnerName: string;
  dmcContactInfo: string;
  appUrl: string;
}): string {
  const inner = `
${badge("✅ Trip Confirmed — Voucher Inside", "#065F46", "#34D399")}
${salutation(d.leadFirstName)}
<p style="margin:0 0 20px;font-size:16px;color:${TEXT_LIGHT};line-height:1.5;">
  Great news! Your booking for <strong>${escapeHtml(d.tripTitle)}</strong> is confirmed. 🎉
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
  <tr><td style="padding:14px 16px;background-color:#0B1120;text-align:center;">
    <p style="margin:0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${TEXT_MUTED};">Trip Confirmation Voucher</p>
    <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:${PRIMARY};">${escapeHtml(d.bookingRef)}</p>
  </td></tr>
  ${infoRow("Trip", d.tripTitle)}
  ${infoRow("Destination", d.destination)}
  ${infoRow("Duration", `${d.days} days`)}
  ${infoRow("Group Size", d.groupSizeStr)}
  ${infoRow("Total Amount", d.totalPaid)}
  ${infoRow("Operator", d.dmcPartnerName)}
  ${infoRow("Operator Contact", d.dmcContactInfo)}
</table>
${heading("Before You Go")}
<p style="margin:0 0 8px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
  Complete your Travel Checklist to make sure you're fully prepared for your adventure.
</p>
${ctaButton("Complete Travel Checklist", `${d.appUrl}/travel-checklist`)}
<p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};text-align:center;line-height:1.5;">
  Have a wonderful trip! 🌍<br/>— The DheeVoy Team
</p>
`;
  return wrapper(inner, "Trip Confirmed!");
}

// ═════════════════════════════════════════════════════════════════════
// TEMPLATE 4: Admin Payment Confirmed Alert (alertDmcPaymentConfirmed → admin)
// ═════════════════════════════════════════════════════════════════════
export function adminPaymentConfirmedEmail(d: {
  tripTitle: string;
  dmcPartnerName: string;
  customerName: string;
  customerEmail: string;
  amount: string;
  bookingId: string;
  appUrl: string;
}): string {
  const inner = `
${badge("✅ Funds Confirmed", "#065F46", "#34D399")}
<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
  A DMC partner has confirmed receipt of funds for a curated trip booking.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
  ${infoRow("Trip Package", d.tripTitle)}
  ${infoRow("DMC Operator", d.dmcPartnerName)}
  ${infoRow("Customer Name", d.customerName)}
  ${infoRow("Customer Email", d.customerEmail)}
  ${infoRow("Total Amount", d.amount)}
  ${infoRow("Booking ID", d.bookingId)}
</table>
${ctaButton("Review in Admin Dashboard", `${d.appUrl}/admin/dmc-review`)}
`;
  return wrapper(inner, "Funds Confirmed");
}