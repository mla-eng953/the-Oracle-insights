# Agent notes for future work on The Oracle

## Architectural invariants — do not break

1. **Algorithm lives server-side.** `supabase/functions/_shared/algorithm.ts` is the single source of truth for fair-price synthesis. The client never computes `trueProb` from raw market data.
2. **CLV is the primary KPI.** ROI is display-only. Any new analytics surface must show CLV first, ROI second.
3. **Strict RLS on every table.** Default-deny. Never add a policy without an explicit `auth.uid()` or `is_admin()` check.
4. **`user_roles` is separate from `profiles`.** Do not merge. Use `has_role()` in all policy predicates.
5. **No first-person in rationales.** Structured `RationaleTemplate` only. If you add LLM-generated text, template-fill from signals; never free-generate facts.
6. **Kill the cohort-based disabling.** Do not re-introduce hard-coded "NBA spreads disabled" logic. Filters go through `shouldSurface` with edge + CI thresholds.
7. **Special-event hubs use the generic `EventHub` driver.** Do not create `/superbowl`, `/all-star`, `/wbc` as standalone routes — add a row to `special_events` and render via `EventHub`.
8. **No Apple IAP bypass.** If you add anything paid on iOS, it must go through StoreKit.
9. **No scraping competitors.** If you need consensus data, pay a vendor (Action Network, Unabated, OpticOdds).

## Adding a new sport

1. Add to `Sport` union in `src/types/oracle.ts`.
2. Add an entry to `SPORT_WEIGHTS` in `generate-picks/index.ts`.
3. Add path in `SPORT_PATHS` in `live-scores/index.ts`.
4. Add the sport to the filter chip list in `src/pages/OracleAnalysis.tsx`.

## Adding a new bet type

1. Add to `BetType` in `src/types/oracle.ts`.
2. Extend the `grade()` function in `settle-picks/index.ts`.
3. Add a sport/bet-type edge threshold in `shouldSurface` if needed.

## Testing the UI without backend

`usePicks` and `useSettlements` both fall back to `MOCK_PICKS` / `MOCK_SETTLEMENTS` when `VITE_SUPABASE_URL` is unset. Good for UI iteration and Apple review screenshots.

## Known follow-ups

- Wire push notifications via APNs + FCM.
- Build `ParlayBuilder` (single responsive component — do not split mobile/desktop).
- Build `OnboardingTutorial` (5 steps; triggered on first auth).
- Build admin UI (`/admin`, gated by `is_admin`).
- Integrate Stripe subscriptions (`/api/stripe/webhook` → `user_subscriptions`).
- Integrate StoreKit 2 for iOS entitlements.
- Add `/privacy` and `/terms` static routes.
- Add Sentry + PostHog.
- Build the backtest CLI (walk-forward validation against `picks` + `pick_settlements`).
