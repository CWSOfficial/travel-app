import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const LAST_UPDATED = "10 June 2026";
const EMAIL = "legal@dheevoy.com";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <Link to="/" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <h1 className="font-bold text-sm">Terms of Service</h1>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8">
          <p className="text-sm text-amber-800 font-medium">By creating an account or using DheeVoy, you agree to these Terms. Please read them carefully. If you do not agree, do not use the service.</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>These Terms of Service ("Terms") govern your use of DheeVoy, operated by DheeVoy Ltd ("Company", "we", "us"). By registering or using the app, you confirm you are at least 16 years of age and have the legal capacity to enter into a binding agreement.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>DheeVoy is an AI-powered travel planning application that provides destination recommendations, visa intelligence, safety ratings, itinerary planning, and travel monitoring. It is an <strong>informational and planning tool only</strong> — it does not operate as a licensed travel agent, insurance provider, or legal adviser.</p>
        </Section>

        <Section title="3. No Guarantee of Accuracy">
          <p>AI-generated recommendations, visa requirements, safety ratings, and cost estimates are provided for informational purposes. They may be inaccurate, outdated, or incomplete. You must independently verify all travel information including visa requirements, entry conditions, and safety advisories with official government sources before travelling.</p>
        </Section>

        <Section title="4. Payments & Subscriptions">
          <p>DheeVoy does not currently offer paid traveller subscriptions or process subscription payments through this app.</p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose</li>
            <li>Attempt to reverse-engineer, scrape, or copy the AI models or data</li>
            <li>Create multiple accounts to circumvent free-tier limits</li>
            <li>Use the service to plan activities that violate the laws of any jurisdiction</li>
            <li>Impersonate another person or entity</li>
          </ul>
        </Section>

        <Section title="6. Travel Safety Disclaimer">
          <p>DheeVoy provides safety ratings and travel advisories from AI-aggregated sources. These are <strong>not official government advisories</strong>. Always consult your government's official travel advisory (e.g. gov.uk/foreign-travel-advice, travel.state.gov) before travelling. We accept no liability for decisions made based solely on our safety ratings.</p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>All content, branding, and AI-generated outputs displayed in DheeVoy are the intellectual property of DheeVoy Ltd. You may not reproduce or distribute any part of the service without written permission.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the maximum extent permitted by law, DheeVoy shall not be liable for:</p>
          <ul>
            <li>Travel decisions made based on app recommendations</li>
            <li>Loss or damage arising from inaccurate visa, safety, or cost information</li>
            <li>Indirect, incidental, or consequential damages</li>
          </ul>
          <p>Our total aggregate liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
        </Section>

        <Section title="9. Termination">
          <p>We may suspend or terminate your account if you breach these Terms. You may delete your account at any time from Profile settings. Upon deletion, your personal data will be erased in accordance with our Privacy Policy.</p>
        </Section>

        <Section title="10. Governing Law">
          <p>These Terms are governed by the laws of <strong>England and Wales</strong>. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. EU consumers retain rights under applicable EU law.</p>
        </Section>

        <Section title="11. Changes to Terms">
          <p>We will notify you of material changes via email or in-app notice at least 30 days in advance. Continued use after the effective date constitutes acceptance.</p>
        </Section>

        <Section title="12. Contact">
          <p>Legal enquiries: <a href={`mailto:${EMAIL}`} className="text-blue-600">{EMAIL}</a></p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-foreground mb-2">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}
