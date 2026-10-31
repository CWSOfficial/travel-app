import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const LAST_UPDATED = "10 June 2026";
const COMPANY = "DheeVoy Ltd";
const EMAIL = "privacy@dheevoy.com";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <Link to="/" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <h1 className="font-bold text-sm">Privacy Policy</h1>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-20 prose prose-sm prose-slate">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 not-prose">
          <p className="text-sm text-blue-800 font-medium">This policy applies to all users globally, including those in the EU (GDPR), UK (UK GDPR / Data Protection Act 2018), United States (CCPA/CPRA), Canada (PIPEDA), Australia (Privacy Act 1988), and other jurisdictions.</p>
        </div>

        <Section title="1. Who We Are">
          <p>{COMPANY} ("we", "us", "our") operates the DheeVoy application. We are the data controller for personal data collected through this app.</p>
          <p>Contact: <a href={`mailto:${EMAIL}`} className="text-blue-600">{EMAIL}</a></p>
        </Section>

        <Section title="2. What Data We Collect">
          <ul>
            <li><strong>Account data:</strong> Email address, full name, password (hashed — never stored in plain text)</li>
            <li><strong>Contact data:</strong> Mobile phone number (optional, for SMS travel alerts)</li>
            <li><strong>Trip data:</strong> Departure city, destination, travel dates, budget preference, group type, travel style, passport country (for visa intelligence)</li>
            <li><strong>Usage data:</strong> Pages visited, features used, timestamps (for service improvement)</li>
            <li><strong>Device data:</strong> Browser type, OS, IP address (for security and fraud prevention)</li>
            <li><strong>Payment data:</strong> We do <strong>not</strong> store any payment card details. All payments are processed by Stripe or PayPal directly via their PCI-DSS Level 1 certified infrastructure. We only store a subscription status flag and transaction reference ID.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul>
            <li>Providing the DheeVoy service including AI-powered travel recommendations</li>
            <li>Sending travel alerts, safety notifications, and booking reminders (where you have opted in)</li>
            <li>Processing subscription payments via Stripe / PayPal</li>
            <li>Personalising your experience based on past trips</li>
            <li>Complying with legal obligations</li>
            <li>Detecting and preventing fraud, abuse, or security incidents</li>
          </ul>
        </Section>

        <Section title="4. Legal Basis for Processing (GDPR / UK GDPR)">
          <ul>
            <li><strong>Contract performance</strong> — to provide the service you signed up for</li>
            <li><strong>Legitimate interests</strong> — security, fraud prevention, service improvement</li>
            <li><strong>Consent</strong> — marketing communications, SMS alerts</li>
            <li><strong>Legal obligation</strong> — tax, fraud prevention, law enforcement requests</li>
          </ul>
        </Section>

        <Section title="5. International Data Transfers">
          <p>DheeVoy is a global service. Your data may be stored and processed in the <strong>United States</strong> (our primary server infrastructure) and other regions where our cloud providers operate.</p>
          <p>For users in the EU/UK, transfers are protected by:</p>
          <ul>
            <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
            <li>The UK International Data Transfer Agreement (IDTA)</li>
            <li>Adequacy decisions where applicable</li>
          </ul>
          <p>By creating a DheeVoy account, you acknowledge that your data will be transferred and processed as described in this Privacy Policy. You may object to this processing or request deletion of your data at any time by deleting your account (see Section 9 — Right to Be Forgotten) or by contacting privacy@dheevoy.com.</p>
        </Section>

        <Section title="6. Data Sharing">
          <p>We do not sell your personal data. We share data only with:</p>
          <ul>
            <li><strong>Stripe / PayPal</strong> — payment processing (they receive only what is needed for the transaction)</li>
            <li><strong>Cloud infrastructure providers</strong> — hosting, storage, database (under data processing agreements)</li>
            <li><strong>AI model providers</strong> — anonymised travel preference data to generate recommendations</li>
            <li><strong>Law enforcement / regulators</strong> — only where legally required</li>
          </ul>
        </Section>

        <Section title="7. Cookies & Tracking">
          <p>We use the following cookies:</p>
          <ul>
            <li><strong>Essential cookies:</strong> Authentication session, CSRF protection — required for the app to function</li>
            <li><strong>Analytics cookies:</strong> Anonymous usage statistics to improve the service (only with your consent)</li>
          </ul>
          <p>You can manage cookie preferences via the cookie banner shown on first visit, or at any time from your profile settings.</p>
        </Section>

        <Section title="8. Data Retention">
          <ul>
            <li>Account data: Retained while your account is active, then deleted within 30 days of account deletion request</li>
            <li>Trip data: Retained for 2 years from last activity, or until account deletion</li>
            <li>Payment transaction references: Retained for 7 years (legal / tax obligation)</li>
            <li>Server logs: Retained for 90 days for security purposes</li>
          </ul>
        </Section>

        <Section title="9. Your Rights">
          <p>Depending on your jurisdiction, you have the following rights:</p>
          <ul>
            <li><strong>Right of access</strong> — request a copy of all data we hold about you</li>
            <li><strong>Right to rectification</strong> — correct inaccurate data</li>
            <li><strong>Right to erasure ("Right to Be Forgotten")</strong> — delete your account and all associated personal data</li>
            <li><strong>Right to restrict processing</strong> — pause processing while a dispute is resolved</li>
            <li><strong>Right to data portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Right to object</strong> — opt out of processing based on legitimate interests</li>
            <li><strong>Right to withdraw consent</strong> — at any time, without affecting past processing</li>
            <li><strong>CCPA rights (California):</strong> Right to know, right to delete, right to opt-out of data sale (we do not sell data)</li>
          </ul>
          <p>To exercise any right: go to <strong>Profile → Privacy & Data → Delete My Account</strong>, or email <a href={`mailto:${EMAIL}`} className="text-blue-600">{EMAIL}</a>. We will respond within <strong>30 days</strong> (GDPR / UK GDPR requirement).</p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>DheeVoy is not directed at children under 16 (or 13 in the US). We do not knowingly collect data from minors. If you believe a minor has registered, contact us at {EMAIL} for immediate removal.</p>
        </Section>

        <Section title="11. Security">
          <p>We implement industry-standard security including:</p>
          <ul>
            <li>TLS/HTTPS encryption in transit</li>
            <li>Passwords hashed with bcrypt (never stored in plain text)</li>
            <li>OTP-based email verification on registration</li>
            <li>No storage of raw payment card data (handled entirely by Stripe/PayPal)</li>
            <li>Regular security audits and vulnerability assessments</li>
          </ul>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We will notify you of material changes via email or an in-app notice at least 30 days before changes take effect. Continued use constitutes acceptance.</p>
        </Section>

        <Section title="13. Contact & Complaints">
          <p>Privacy enquiries: <a href={`mailto:${EMAIL}`} className="text-blue-600">{EMAIL}</a></p>
          <p>EU/UK users: If unsatisfied with our response, you may lodge a complaint with your national data protection authority (e.g. ICO in the UK at <a href="https://ico.org.uk" className="text-blue-600">ico.org.uk</a>, or your local EU supervisory authority).</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-foreground mb-2 not-prose">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}