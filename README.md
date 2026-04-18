# The Oracle

Sports-betting intelligence PWA. CLV-first analytics, server-side algorithm, compliance-gated, built for PWA → iOS App Store.

## What's in v1 foundation

- **Stack:** Vite + React 18 + TypeScript 5 + Tailwind v3 + shadcn-style primitives + TanStack Query v5 + React Router + Framer Motion + Supabase + Radix UI.
- **PWA:** `vite-plugin-pwa` with NetworkFirst API caching, StaleWhileRevalidate for ESPN assets, OAuth-safe navigate fallback denylist.
- **Algorithm:** Server-side in `supabase/functions/_shared/algorithm.ts`. Per-sport learned weights (`SPORT_WEIGHTS`) replace the fixed 60/40 blend. Filters are edge/CI-driven, not cohort-based.
- **CLV-first analytics:** `useCLV` + `CLVChart` + `CLVBadge` surface mean CLV (bp), median, beat-close %, t-stat, n. ROI is secondary.
- **Strategy profiles:** `StrategyProfileEditor` — per-user bankroll, Kelly fraction, per-pick cap, min edge, sport / bet-type allowlists. Stake suggestions recomputed per user via `kellyStake`.
- **Compliance:** `ComplianceGate` blocks restricted US states + blocked countries, enforces 21+ age gate, surfaces responsible-gambling controls and 1-800-GAMBLER.
- **Schema:** Postgres migrations with strict RLS, `user_roles` isolated from `profiles`, `has_role()` security-definer, `settlement_disputes` table for grading challenges.
- **Edge functions:** `generate-picks`, `settle-picks`, `capture-closing-odds`, `live-scores`, `compliance-check`, `track-pick`.

## Deliberately NOT in v1

- Specialty event hubs (Super Bowl, All-Star, March Madness, WBC, Fight Night) — covered by generic `EventHub` + driver table (populate `special_events` row to create one).
- Admin UI, onboarding tutorial, full news feed, parlay builder, live box-score progress bars, push notifications, Stripe/StoreKit. All slotted for v1.1.
- LLM-generated rationales. Structured `RationaleTemplate` from signals only — no hallucination surface.
- "Algorithm integrity hash" build check. Replaced by server-side enforcement.

## Setup

```sh
pnpm install
cp .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
pnpm dev
```

With no Supabase env vars, the app runs against in-memory mock data — useful for UI work.

## Supabase

```sh
supabase link --project-ref <ref>
supabase db push
supabase functions deploy --no-verify-jwt generate-picks settle-picks capture-closing-odds compliance-check
supabase functions deploy live-scores track-pick
```

Required function secrets: `ODDS_API_KEY`, `KALSHI_API_KEY`. Do not commit.

## Critical before App Store submission

See `COMPLIANCE.md`.

## Algorithm tuning knobs

- `SPORT_WEIGHTS` in `generate-picks/index.ts` — per-sport blend of sharp consensus / signal market / news.
- `shouldSurface` in `_shared/algorithm.ts` — edge + CI gates per bet type.
- `assignTier` — confidence + edge bucketing.
- `defaultSizing` — pre-personalization Kelly default; per-user overrides in `lib/kelly.ts` on the client.

## Icons

Generate PNG icons from `public/icon.svg`:

```sh
npx @squoosh/cli --resize '{"enabled":true,"width":192,"height":192}' --oxipng auto public/icon.svg -d public
# rename to icon-192.png and icon-512.png
```

## Project tree

```
src/
  types/        Oracle, Strategy, Compliance domain models
  lib/          oddsMath, kelly, clv, supabase client, utils, queryKeys
  hooks/        useAuth, useAppData, usePicks, useCLV, useStrategyProfile, useCompliance, useLiveScores
  contexts/     ThemeProvider, ComplianceProvider
  components/   AppShell, AppNav, PickCard, SignalList, EdgeDisplay, CLVBadge, CLVChart, BankrollMeter,
                StrategyProfileEditor, ComplianceGate, EventHub, ErrorBoundary, PageTransition, ...
  pages/        Index, OracleAnalysis, Picks, PickDetails, Results, MarketIntel, Analytics,
                Profile, Settings, Compliance, Auth, Install, NotFound
  router/       AnimatedRoutes
supabase/
  migrations/   0001 init, 0002 picks, 0003 strategy, 0004 compliance, 0005 rls
  functions/    generate-picks, settle-picks, capture-closing-odds, live-scores,
                compliance-check, track-pick, _shared
```
