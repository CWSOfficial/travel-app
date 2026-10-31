import { base44 } from "@/api/base44Client";
import { getPartnerId } from "@/lib/partnerAttribution";
import { trackEvent } from "@/lib/analytics";
import { getGuestClaimHash } from "@/lib/guestClaimToken";

// Reusable outbound partner-referral link + helper.
// When clicked it (1) appends ?ref=dheevoy&session_id=<short> to the destination URL
// and (2) logs a partner_referral_out AiSessionLog entry (partner name, final URL,
// contact if available) so both sides can reconcile leads independently.

// Short, opaque id for the outbound tracking param.
function shortSessionId() {
  try {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

// Append ref=dheevoy&session_id=... preserving any existing query params.
export function buildPartnerUrl(baseUrl) {
  const sid = shortSessionId();
  try {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set("ref", "dheevoy");
    url.searchParams.set("session_id", sid);
    return url.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}ref=dheevoy&session_id=${sid}`;
  }
}

// Log an outbound partner-referral click. Returns the final (tracked) URL so the
// caller can open the exact same URL that was recorded.
export async function logPartnerReferral({ partnerName, url, contact }) {
  const finalUrl = buildPartnerUrl(url);
  try {
    await base44.entities.AiSessionLog.create({
      flow_type: "partner_referral_out",
      guest_claim_hash: await getGuestClaimHash(),
      destination: partnerName,
      partner_id: getPartnerId(),
      recommendation_shown: finalUrl,
      contact_name: contact?.name ?? null,
      contact_email: contact?.email ?? null,
      cta_clicked: true,
    });
  } catch {
    /* non-blocking */
  }
  trackEvent("partner_referral_out", { partner: partnerName });
  return finalUrl;
}

// Reusable link/button. Renders as an <a>; opens the tracked URL in a new tab on click.
export default function PartnerReferralLink({
  partnerName,
  url,
  contact,
  children,
  className,
  ...rest
}) {
  const handleClick = (e) => {
    e.preventDefault();
    logPartnerReferral({ partnerName, url, contact }).then((finalUrl) => {
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    });
  };
  return (
    <a
      href={url}
      onClick={handleClick}
      className={className}
      rel="nofollow sponsored"
      target="_blank"
      {...rest}
    >
      {children}
    </a>
  );
}