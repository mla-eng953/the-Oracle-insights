# Compliance & App Store Readiness

Track this document top-to-bottom before submitting to Apple. Every unchecked item is a blocker.

## 1. Jurisdictional gating

- [x] Server-side geo check (`compliance-check` edge fn) using Cloudflare-style `cf-ipcountry` + `cf-region-code` headers. Result cached per-user in `compliance_checks`.
- [x] `RESTRICTED_US_STATES` list (CA, TX, GA, SC, AL, MN, MO, HI, UT, ID, WI, OK, AK) — **review quarterly** against the latest state-level legislation. This list is conservative, not authoritative.
- [x] `BLOCKED_COUNTRIES` per US sanctions (CU, IR, KP, SY, RU).
- [x] **MaxMind GeoIP2 Insights** integration in `_shared/geoip.ts`. Falls back to CF headers when env vars unset.
- [x] **VPN / Tor / hosting-provider blocking** when `COMPLIANCE_BLOCK_ANONYMIZERS=1` (default on).
- [ ] Cellular / Wi-Fi GPS reconciliation on iOS (`CoreLocation`) — IP alone fails for travelers.

## 2. Age verification

- [x] Client-side 21+ gate (`ComplianceGate`) with DOB input, persisted in `age_verifications`.
- [x] **Persona ID-verification** integration: `create-persona-inquiry` edge fn launches the hosted flow; `persona-webhook` upserts `age_verifications.status` to `approved` / `declined`. UI in `IdVerify` component on Compliance page.
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
- [x] Guideline 3.1.1 / 3.1.3 — **credits cannot be converted to anything purchasable without IAP**. Current architecture: keep credits free/non-purchasable on iOS, Pro subscription must go through **StoreKit 2** (not Stripe). Separate entitlement reconciliation:
  - Web users → Stripe subscription → `user_subscriptions.stripe_subscription_id` (`stripe-webhook` + `entitlements` table).
  - iOS users → StoreKit → `user_subscriptions.apple_original_transaction_id` (`apple-webhook` with JWS chain pinned to Apple Root CA-G3).
- [ ] Guideline 5.3.3 (gaming, gambling, and lotteries) — you're **informational**, not a sportsbook. Make this explicit in your review notes to Apple.
- [ ] Privacy nutrition label: Data Linked to User = Contact Info, Identifiers, Usage. Do **not** declare tracking (no IDFA / third-party ad SDK).
- [ ] No betting links that deep-link into sportsbook apps from iOS build — classified as "facilitating real-money gambling" without an operator license.

## 6. Privacy & data

- [x] RLS on every table.
- [x] Privacy policy (`/privacy`) + Terms of Service (`/terms`) routes.
- [x] Data deletion: self-serve at `/settings/delete` → `delete-account` edge fn cascades through all user-scoped tables and `auth.users`. Satisfies Apple 5.1.1(v) and CCPA.
- [ ] DSR (data subject request) endpoint for GDPR/CCPA export — `export-account-data` edge fn TBD.
- [ ] Signed URLs for any user-generated content in Storage.

## 7. Payments

- [ ] Stripe for web. Use Checkout, not raw Elements, unless you need custom flow.
- [ ] StoreKit 2 for iOS; webhook-verify server-side with Apple's `/inApps/v1/subscriptions/{txId}` endpoint.
- [ ] Sales tax via Stripe Tax.

## 8. Operations

- [x] Error tracking: Sentry (`src/lib/telemetry.ts` + `ErrorBoundary` integration; respects opt-out and DNT).
- [x] Product analytics: PostHog (autocapture off, IP scrubbed, opt-out surfaced in Settings).
- [ ] Edge-function logs streamed to BetterStack / Grafana.
- [x] `pg_cron` schedules in `20260418000008_cron.sql`: `generate-picks` (15 + 23 UTC), `capture-closing-odds` (every minute, self-filtering), `settle-picks` (every 5 min).
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
