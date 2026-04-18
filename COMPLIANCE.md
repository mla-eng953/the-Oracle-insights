# Compliance & App Store Readiness

Track this document top-to-bottom before submitting to Apple. Every unchecked item is a blocker.

## 1. Jurisdictional gating

- [x] Server-side geo check (`compliance-check` edge fn) using Cloudflare-style `cf-ipcountry` + `cf-region-code` headers. Result cached per-user in `compliance_checks`.
- [x] `RESTRICTED_US_STATES` list (CA, TX, GA, SC, AL, MN, MO, HI, UT, ID, WI, OK, AK) — **review quarterly** against the latest state-level legislation. This list is conservative, not authoritative.
- [x] `BLOCKED_COUNTRIES` per US sanctions (CU, IR, KP, SY, RU).
- [ ] Integrate a paid IP intelligence provider (MaxMind GeoIP2 Precision or IPInfo) for production — free CF headers miss VPN detection.
- [ ] VPN / proxy detection — reject if `anonymous_proxy` or `hosting_provider` flags set.
- [ ] Cellular / Wi-Fi GPS reconciliation on iOS (`CoreLocation`) — IP alone fails for travelers.

## 2. Age verification

- [x] Client-side 21+ gate (`ComplianceGate`) with DOB input, persisted in `age_verifications`.
- [ ] Replace self-attested DOB with ID-verification partner (Veriff, Jumio, Persona) before store submission. Self-attested won't pass Apple review for a sports-betting-adjacent app.
- [ ] Refuse bulk account creation from same device — device-fingerprint via FingerprintJS or fingerprint-oss.

## 3. Responsible gambling

- [x] 1-800-GAMBLER footer on every page (`ResponsibleGamblingBanner`).
- [x] Cool-off self-exclusion controls in `Compliance` page.
- [x] `rg_state` table with `self_excluded_until`, `daily_session_limit_minutes`, `loss_limit_usd`.
- [x] `track-pick` edge fn enforces self-exclusion window.
- [ ] 45-minute session nudge (scaffolded in `useRespectfulSessionNudge`, wire into `AppShell`).
- [ ] Loss-chasing detection: if consecutive losses ≥ 3 *and* stake increasing, force a cool-off prompt.
- [ ] Multilingual support for problem-gambling hotlines per jurisdiction.

## 4. Content & marketing claims

- [ ] **Do not publish "+X units" or "+Y% ROI" anywhere** until you have ≥ 2,000 graded picks per bet type and a 95% CI above zero. `summarize()` in `lib/clv.ts` computes `tStat`; require `|t| > 2` before any public ROI claim.
- [x] Every pick card carries the "analysis, not advice" framing (via the `ResponsibleGamblingBanner`).
- [ ] App Store listing must include: "entertainment and educational purposes only", "not a sportsbook", "21+", "not available in <states>".
- [ ] Paid acquisition creative: remove any "guaranteed", "lock", "sure thing" copy. FTC and state AGs actively enforce.

## 5. Apple App Store specifics

- [ ] App category: **Sports / Reference**, age rating **17+** (18+ minimum; Apple has no 21+ tier).
- [ ] Guideline 4.5.4 (push notifications) — user-opt-in only; no promotional push without consent.
- [ ] Guideline 3.1.1 / 3.1.3 — **credits cannot be converted to anything purchasable without IAP**. Current architecture: keep credits free/non-purchasable on iOS, Pro subscription must go through **StoreKit 2** (not Stripe). Separate entitlement reconciliation:
  - Web users → Stripe subscription → `user_subscriptions.stripe_subscription_id`
  - iOS users → StoreKit → `user_subscriptions.apple_original_transaction_id`
- [ ] Guideline 5.3.3 (gaming, gambling, and lotteries) — you're **informational**, not a sportsbook. Make this explicit in your review notes to Apple.
- [ ] Privacy nutrition label: Data Linked to User = Contact Info, Identifiers, Usage. Do **not** declare tracking (no IDFA / third-party ad SDK).
- [ ] No betting links that deep-link into sportsbook apps from iOS build — classified as "facilitating real-money gambling" without an operator license.

## 6. Privacy & data

- [x] RLS on every table.
- [ ] Privacy policy (`/privacy`) + Terms of Service (`/terms`) routes — required by Apple and by CCPA/GDPR.
- [ ] Data deletion: self-serve "Delete my account" in `Profile` page. Apple 5.1.1(v) requires it since 2022.
- [ ] DSR (data subject request) endpoint for GDPR/CCPA export.
- [ ] Signed URLs for any user-generated content in Storage.

## 7. Payments

- [ ] Stripe for web. Use Checkout, not raw Elements, unless you need custom flow.
- [ ] StoreKit 2 for iOS; webhook-verify server-side with Apple's `/inApps/v1/subscriptions/{txId}` endpoint.
- [ ] Sales tax via Stripe Tax.

## 8. Operations

- [ ] Error tracking: Sentry.
- [ ] Product analytics: PostHog or Mixpanel.
- [ ] Edge-function logs streamed to BetterStack / Grafana.
- [ ] Daily job: `capture-closing-odds` must run 20 min pre-kickoff per match. Use Supabase `pg_cron` or GitHub Actions with secrets.
- [ ] Weekly model-drift check: compare rolling-30-day CLV distribution per sport against the previous 30d — alert if it shifts >1σ.

## 9. Model governance

- [ ] Pin model version in every inserted pick (`model_version`). Never mutate existing picks when changing weights.
- [ ] Shadow models: run v-next in the background and log its picks, do not surface. Promote only when CLV beats champion by ≥ 5bp over 500 picks.
- [ ] No "strategy change based on 30 picks" — every change must be walk-forward validated on held-out data.

## 10. Review log

Keep this section dated — auditors and Apple reviewers may ask.

| Date | Reviewer | Outcome | Notes |
|---|---|---|---|
| _tbd_ | _tbd_ | _tbd_ | _tbd_ |
