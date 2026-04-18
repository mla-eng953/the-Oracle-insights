# App Review notes — paste into App Store Connect → App Review Information

## Demo account

```
Email:    reviewer@oracleinsights.app
Password: <set per submission, rotate after each review>
```

This account is pre-verified (age + jurisdiction) so the reviewer can bypass
the gates without going through the live Persona ID flow. Geo-locked to a
US-allowed state via server override on the `compliance_checks` row.

## Notes for the reviewer

> **The Oracle is informational and educational only.** We do not accept
> wagers, hold funds, or facilitate payouts. We are not a sportsbook and
> we do not deep-link to any sportsbook from the iOS build.
>
> All subscription billing in the iOS app is handled by Apple In-App
> Purchase (StoreKit 2). The Pro and Elite tiers unlock additional
> analytics features (CLV dashboards, strategy profiles, alerts). No
> alternative payment mechanism is offered inside the app.
>
> The reviewer credentials above bypass our 21+ ID verification (Persona)
> and our jurisdictional gating (MaxMind) for testing convenience. Real
> users must complete both before any paid feature unlocks.
>
> Responsible-gambling resources (1-800-GAMBLER, self-exclusion, cool-off)
> are surfaced on every page via a persistent footer.
>
> Source-of-truth for all claims: https://app.oracleinsights.app/compliance

## Common reviewer questions, pre-answered

**Q: Why is this 17+ rather than 12+?**
A: Apple's age rating engine returns 17+ when "Frequent/Intense Simulated
Gambling" is selected, which we declare conservatively even though we are
not a sportsbook. Apple has no 21+ rating; we enforce 21+ in-app via
Persona ID verification.

**Q: Why is StoreKit used for subscriptions but Stripe is mentioned in the
Privacy Policy?**
A: Web users (oracleinsights.app) subscribe via Stripe. iOS users
subscribe via StoreKit. The privacy policy lists every subprocessor; the
iOS build never invokes Stripe.

**Q: Where do prediction-market signals come from?**
A: Aggregated, anonymized prediction-market probability is one input to
our model. We do not display third-party logos in-app.

**Q: How do you handle in-state restrictions?**
A: `compliance-check` (Supabase Edge Function) consults MaxMind GeoIP2
Insights server-side. Restricted-state IPs see a "Not available in your
region" page; subscriptions are blocked. App Store Connect availability
is also restricted to non-blocked states/countries as a defense-in-depth
measure.

## Build configuration the reviewer will see

- Universal Links enabled for `app.oracleinsights.app`.
- APNs entitlement: `aps-environment = production`.
- In-App Purchase capability: enabled.
- No background modes besides remote notifications.
- No tracking SDK — no IDFA prompt; no `tracking` declared in the privacy
  manifest.
