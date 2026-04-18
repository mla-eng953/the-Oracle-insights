import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";

const LAST_UPDATED = "April 18, 2026";

export default function Terms() {
  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto flex flex-col gap-4 py-6 px-4">
        <header>
          <h1 className="text-2xl font-semibold">Terms of Service</h1>
          <p className="text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
        </header>

        <Card><CardContent className="p-5 prose prose-invert prose-sm max-w-none space-y-4">
          <Section title="1. Acceptance">
            <p>By creating an account or using The Oracle (&ldquo;Service&rdquo;), you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.</p>
          </Section>

          <Section title="2. What The Oracle is — and isn't">
            <p><b>Informational and educational only.</b> The Oracle produces sports analytics and betting-market intelligence. We do not accept wagers, hold funds, or facilitate payouts. Nothing in the Service is advice, a recommendation, or a guarantee of outcome. Any analysis is probabilistic and may be wrong.</p>
          </Section>

          <Section title="3. Eligibility">
            <ul className="list-disc pl-5 space-y-1">
              <li>21 years of age or older.</li>
              <li>Not located in a restricted jurisdiction (subject to change; see our Compliance page).</li>
              <li>Not using a VPN, Tor, proxy, or hosting provider to bypass jurisdictional controls.</li>
              <li>Not on a self-exclusion list in your jurisdiction.</li>
            </ul>
          </Section>

          <Section title="4. Your account">
            <p>You are responsible for maintaining the confidentiality of your credentials and for all activity on your account. Notify us immediately of any unauthorized use.</p>
          </Section>

          <Section title="5. Subscriptions and payment">
            <p>Paid plans renew automatically until cancelled. Web subscriptions billed via Stripe; iOS subscriptions billed via Apple under Apple's terms. Cancellations take effect at the end of the current period. No partial refunds except where required by law.</p>
          </Section>

          <Section title="6. Responsible use">
            <p>Gambling carries risk, including financial loss and addiction. We provide self-exclusion and cool-off tools and encourage their use. If you or someone you know may have a gambling problem, call 1-800-GAMBLER (US) or visit <a href="https://ncpgambling.org" className="underline" target="_blank" rel="noreferrer">ncpgambling.org</a>.</p>
          </Section>

          <Section title="7. Acceptable use">
            <p>You agree not to: (a) reverse engineer the Service, (b) scrape or automate access beyond documented APIs, (c) resell or republish Oracle-generated content, (d) use the Service to engage in fraud or money laundering, (e) misrepresent your identity, age, or jurisdiction.</p>
          </Section>

          <Section title="8. Intellectual property">
            <p>The Oracle, its models, UI, and content are owned by Oracle Insights, Inc. or its licensors. Limited non-exclusive license is granted for personal use only. You may not republish, screenshot for resale, or feed Oracle outputs into competing products.</p>
          </Section>

          <Section title="9. Disclaimers">
            <p>THE SERVICE IS PROVIDED &ldquo;AS IS.&rdquo; WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE ACCURACY, AVAILABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.</p>
          </Section>

          <Section title="10. Limitation of liability">
            <p>To the maximum extent permitted by law, Oracle Insights is not liable for indirect, incidental, or consequential damages, or for any gambling losses. Our total aggregate liability is limited to the fees you paid us in the 12 months preceding the claim.</p>
          </Section>

          <Section title="11. Indemnification">
            <p>You agree to indemnify Oracle Insights against claims arising from your breach of these Terms or your use of the Service in violation of any law.</p>
          </Section>

          <Section title="12. Arbitration and class waiver">
            <p>Disputes will be resolved by binding individual arbitration under the American Arbitration Association Consumer Rules. You and we waive the right to a jury trial and to participate in a class action. Small-claims court remains available for qualifying claims. You may opt out within 30 days of account creation by emailing <a href="mailto:legal@oracleinsights.app" className="underline">legal@oracleinsights.app</a>.</p>
          </Section>

          <Section title="13. Changes">
            <p>We may update these Terms. Material changes will be announced in-app. Continued use constitutes acceptance.</p>
          </Section>

          <Section title="14. Governing law">
            <p>Delaware law governs, excluding conflict-of-laws rules.</p>
          </Section>

          <Section title="15. Contact">
            <p>legal@oracleinsights.app — Oracle Insights, Inc., <i>[mailing address placeholder]</i>.</p>
          </Section>
        </CardContent></Card>

        <p className="text-[10px] text-muted-foreground text-center">
          This template is a starting point, not legal advice. Have counsel review before production.
        </p>
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
