# Pre-submission checklist — work top to bottom; do not skip

## A. Backend ready

- [ ] Supabase project provisioned in production (not the dev/lovable instance).
- [ ] All migrations applied: `supabase db push`.
- [ ] All edge functions deployed: `supabase functions deploy <name>` for every dir under `supabase/functions/` except `_shared`.
- [ ] All secrets in `app-store/SECRETS.md` populated.
- [ ] Cloudflare Worker deployed: `cd cloudflare && pnpm deploy`.
- [ ] `pnpm fetch-apple-ca` run and `apple-root-ca.json` committed (or deployed via env override).
- [ ] BetterStack source token live; logs flowing.
- [ ] Sentry production project created; DSN in `VITE_SENTRY_DSN`.
- [ ] Apple Server Notifications V2 webhook URL configured in App Store Connect.
- [ ] Stripe webhook endpoint configured and verified (use Stripe CLI: `stripe listen --forward-to <fn-url>`).
- [ ] Persona webhook URL + signing secret configured.

## B. Web app ready

- [ ] Custom domain `app.oracleinsights.app` configured + TLS green.
- [ ] AASA reachable at `https://app.oracleinsights.app/.well-known/apple-app-site-association` with `Content-Type: application/json` (no `.json` extension), no auth, no redirects.
- [ ] AASA verified via `curl -I` and Apple's [AASA validator](https://branch.io/resources/aasa-validator/).
- [ ] PWA manifest passes Lighthouse PWA audit ≥ 90.
- [ ] Service worker installs and caches (test in Chrome devtools Application tab).
- [ ] Privacy Policy reachable at `/privacy`. Terms at `/terms`. Both linked from app footer.
- [ ] Compliance gate works for restricted IPs (test with VPN to a blocked state).

## C. iOS shell ready

- [ ] `pnpm icons` run; full `AppIcon.appiconset` populated.
- [ ] `xcodegen generate` run from `ios/`.
- [ ] Open in Xcode, signing team selected, profile generated automatically.
- [ ] Capabilities: In-App Purchase, Push Notifications, Associated Domains all checked.
- [ ] Universal Link test: install to TestFlight, tap a `https://app.oracleinsights.app/picks/<id>` link in Mail — opens in app, not Safari.
- [ ] StoreKit 2 sandbox purchase works end-to-end through `apple-webhook` → `entitlements` row.
- [ ] APNs sandbox push works through `send-push` → `aps.alert` rendered.
- [ ] PrivacyInfo.xcprivacy in bundle (Xcode → target → Build Phases → Copy Bundle Resources).
- [ ] StoreKit configuration file disabled for Release schemes (so production uses real Apple servers, not the local file).

## D. App Store Connect ready

- [ ] App created with bundle ID `app.oracleinsights.OracleApp`.
- [ ] Both subscription products created with the IDs from `METADATA.md`. Localized display name + description per locale.
- [ ] App Privacy answers filled per `PRIVACY_LABEL.md`.
- [ ] App Information filled per `METADATA.md`.
- [ ] Screenshots uploaded per `SCREENSHOTS.md`.
- [ ] Promotional text + description + keywords pasted from `METADATA.md`.
- [ ] App Review Information filled per `REVIEW_NOTES.md` — including a working demo account.
- [ ] Age rating answered with "Frequent/Intense Simulated Gambling = Yes".
- [ ] Encryption: "Does not use encryption beyond what's exempt" → Yes.
- [ ] Availability: blocked US states + countries deselected manually (defense in depth).
- [ ] Tax + banking + paid apps agreement signed.

## E. Legal & compliance

- [ ] Counsel has reviewed `/privacy` and `/terms`. Names + addresses in both filled.
- [ ] DMCA agent registered if you accept user-generated content (you don't yet — skip).
- [ ] Sales-tax registration in any state where required (Stripe Tax handles, but registration is on you).
- [ ] DPA signed with Supabase, Stripe, Apple (via D-U-N-S), Persona, MaxMind, FingerprintJS, BetterStack, Sentry, PostHog.

## F. Quality gates

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes with zero warnings.
- [ ] `pnpm build` succeeds.
- [ ] Backtest CLI run: `deno run -A scripts/backtest.ts --start <90d ago>` — confirm no errors and a non-zero `n`.
- [ ] No "+X% ROI" or "+Y units" claims in App Store copy unless `t-stat > 2` over ≥ 2,000 settled picks.
- [ ] Manual smoke test of every primary route on a fresh sandbox account.
- [ ] Manual smoke of self-exclusion: enable cool-off, attempt to track a pick → blocked.
- [ ] Manual smoke of account deletion: end-to-end, verify auth.users row gone.
- [ ] Manual smoke of DSR export: download bundle, inspect for completeness.

## G. Submission

- [ ] Marketing version + build number bumped.
- [ ] `xcodebuild archive` → upload via Transporter or `xcodebuild -exportArchive`.
- [ ] TestFlight: external testers (not just internal) for ≥ 24h with no crashes.
- [ ] Submit for App Review.
- [ ] First response usually 24-48h. Address any rejection by editing `REVIEW_NOTES.md` and resubmitting — don't argue, just clarify.

## H. Post-submission

- [ ] Monitor Sentry for crashes for 72h.
- [ ] Monitor BetterStack for `error`-level edge function logs.
- [ ] Watch `audit_logs` for `account_deleted` spikes (chargeback / dispute risk indicator).
- [ ] Run `check-model-drift` manually after first week of production traffic.
- [ ] Set up a weekly review of `closing_odds_join` to confirm CLV remains positive per sport.
