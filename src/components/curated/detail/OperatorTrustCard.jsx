import { Compass, Phone } from "lucide-react";

// Operator & trust section. Shows only real operator data — no invented
// reviews, ratings, booking counts, or "verified" claims beyond stored badges.
export default function OperatorTrustCard({ trip }) {
  const name = trip?.dmc_partner_name;
  const contact = trip?.dmc_contact_info;
  const badge = trip?.operator_badge_text;
  if (!name) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="rounded-2xl bg-curated-card border border-curated-border p-5 md:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-curated-accent/15 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6 text-curated-accent" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-curated-heading">Your Local Trip Operator</h2>
            {badge && (
              <span className="inline-block mt-1 text-[11px] font-semibold rounded-full bg-curated-accent/15 text-curated-accent px-2.5 py-0.5">
                {badge}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-curated-text leading-relaxed mb-3">
          This trip is fulfilled and managed by{" "}
          <strong className="text-curated-heading">{name}</strong>. DheeVoy helps you discover and prepare
          for the trip — booking and payment are handled directly by the operator.
        </p>
        {contact && (
          <div className="rounded-xl bg-curated-surface border border-curated-border p-3 text-sm text-curated-text flex items-start gap-2">
            <Phone className="w-4 h-4 text-curated-muted shrink-0 mt-0.5" /> <span>{contact}</span>
          </div>
        )}
      </div>
    </section>
  );
}