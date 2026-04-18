import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";

const LAST_UPDATED = "April 18, 2026";

export default function Privacy() {
  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto flex flex-col gap-4 py-6 px-4">
        <header>
          <h1 className="text-2xl font-semibold">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
        </header>

        <Card><CardContent className="p-5 prose prose-invert prose-sm max-w-none space-y-4">
          <Section title="1. Who we are">
            <p>The Oracle is operated by Oracle Insights, Inc. (&ldquo;we,&rdquo; &ldquo;us&rdquo;). We are a content and analytics service. We are not a sportsbook; we do not accept wagers or hold funds.</p>
          </Section>

          <Section title="2. Information we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Account:</b> email, auth identifiers, plan/entitlement state.</li>
              <li><b>Compliance:</b> country, region, date of birth (self-attested or ID-verified via Persona), VPN/Tor detection flags. Stored in your user row with strict RLS.</li>
              <li><b>Usage:</b> picks viewed and tracked, strategy profile settings, bankroll (we do not store payment card numbers — handled by Stripe or Apple).</li>
              <li><b>Device/Telemetry:</b> anonymized crash reports (Sentry) and product analytics events (PostHog). Opt-out in Settings.</li>
              <li><b>Payments:</b> Stripe Customer ID and/or Apple original_transaction_id. Card and bank data never touches our servers.</li>
            </ul>
          </Section>

          <Section title="3. What we do not collect">
            <p>We do not collect location beyond country + region. We do not run third-party ad SDKs and do not sell, share, or broker personal data to advertisers.</p>
          </Section>

          <Section title="4. Why we collect it">
            <p>Compliance gating (required by Apple and by state regulators), fraud prevention, account security, service operation, and generating your personalized pick feed. Telemetry is used only to debug and improve the product.</p>
          </Section>

          <Section title="5. Who receives your data">
            <ul className="list-disc pl-5 space-y-1">
              <li>Supabase — managed Postgres, auth, edge functions.</li>
              <li>Stripe — web subscriptions.</li>
              <li>Apple — iOS subscriptions via App Store.</li>
              <li>Persona — government-ID verification.</li>
              <li>MaxMind — IP intelligence for compliance gating.</li>
              <li>Sentry, PostHog — telemetry (opt-out supported).</li>
            </ul>
            <p>These subprocessors are contractually bound to confidentiality and processing-limitation obligations.</p>
          </Section>

          <Section title="6. Your rights">
            <ul className="list-disc pl-5 space-y-1">
              <li>Access and export your data (see Settings → Download my data).</li>
              <li>Delete your account and all associated data (Settings → Delete account). This is irreversible and complies with Apple 5.1.1(v) and CCPA.</li>
              <li>Opt out of telemetry.</li>
              <li>CCPA / GDPR subjects: contact <a href="mailto:privacy@oracleinsights.app" className="underline">privacy@oracleinsights.app</a>.</li>
            </ul>
          </Section>

          <Section title="7. Retention">
            <p>Account data is kept for as long as your account is active. On deletion, we remove your data within 30 days except where retention is required by law (payment records: 7 years).</p>
          </Section>

          <Section title="8. Security">
            <p>TLS in transit, encryption at rest, row-level security on every table, separate production and analytics environments. Incident disclosure within 72 hours of confirmed breach.</p>
          </Section>

          <Section title="9. Children">
            <p>The Oracle is restricted to users 21 and older. We do not knowingly collect data from anyone under that age. If we learn we have, we delete it.</p>
          </Section>

          <Section title="10. Contact">
            <p>privacy@oracleinsights.app — Oracle Insights, Inc., <i>[mailing address placeholder]</i>.</p>
          </Section>
        </CardContent></Card>
      </div>
    </PageTransition>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-1">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}
