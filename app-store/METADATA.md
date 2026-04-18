# App Store metadata — copy these fields verbatim into App Store Connect

## App Information

| Field | Value |
|---|---|
| **Name** | The Oracle |
| **Subtitle** | Sports betting intelligence (≤ 30 chars) |
| **Bundle ID** | `app.oracleinsights.OracleApp` |
| **SKU** | `oracle-ios-001` |
| **Primary category** | Sports |
| **Secondary category** | Reference |
| **Age rating** | 17+ (Frequent/Intense Simulated Gambling) |
| **Content rights** | You own or have rights to all content |

## Pricing & availability

| Field | Value |
|---|---|
| Price | Free (with IAP) |
| Availability | All territories **except** the US states / countries blocked in `compliance-check` (manual exclusions in App Store Connect: CA, TX, GA, SC, AL, MN, MO, HI, UT, ID, WI, OK, AK; CU, IR, KP, SY, RU). |
| Pre-orders | Off |

## In-App Purchases

| Reference name | Product ID | Type | Subscription group | Price |
|---|---|---|---|---|
| Pro Monthly | `app.oracleinsights.pro.monthly` | Auto-Renewable Subscription | `oracle-subscriptions` | $19.99 |
| Elite Monthly | `app.oracleinsights.elite.monthly` | Auto-Renewable Subscription | `oracle-subscriptions` | $49.99 |

Both products: 7-day free trial, monthly renewal. Mark Pro as level 1, Elite as level 2 in the subscription group so users can upgrade/downgrade.

## App Store listing copy

### Promotional text (170 chars)

> CLV-first betting analytics. Per-pick edge, confidence intervals, and bankroll-aware Kelly stakes — built for serious bettors.

### Description (≤ 4000 chars)

```
The Oracle is professional-grade sports betting analytics, not a sportsbook.

ORACLE PICKS
- Edge-only filtering — every pick shows true probability, implied probability,
  and the gap between them with a 95% confidence interval.
- Per-sport learned weights blend sharp consensus with prediction-market signals.
- Tier filters: Conservative, Moderate, Aggressive — pick what your bankroll can bear.

CLV-FIRST ANALYTICS
- Closing Line Value is the primary edge metric, not ROI.
- Rolling 30-day CLV per sport with confidence intervals and t-statistics.
- Walk-forward backtests catch model drift before the bankroll does.

STRATEGY PROFILES
- Bankroll, unit size, Kelly fraction, per-pick cap, sport allowlist — all yours.
- Stake recommendations respect your settings, never the marketing team's.

MARKET INTEL
- Line shopping across books with best-line callouts.
- Steam moves, sharp vs public splits, implied skew.

RESPONSIBLE BY DESIGN
- 21+ age verification.
- Self-exclusion and cool-off controls in one tap.
- 1-800-GAMBLER on every screen. Loss-chasing nudges built in.

The Oracle is informational and educational only. We do not accept wagers,
hold funds, or facilitate payouts. Past performance does not guarantee
future results. If you or someone you know has a gambling problem, call
1-800-GAMBLER.
```

### Keywords (100 chars, comma-separated)

```
betting,sports betting,nfl,nba,mlb,nhl,picks,parlay,clv,analytics,handicapping,sharp,kelly,oracle
```

### What's New (per release)

```
Initial App Store release.
- Edge-only Oracle picks across NFL, NBA, MLB, NHL, NCAA, MLS, EPL, UFC.
- CLV dashboards with confidence intervals.
- Bankroll-aware Kelly stake recommendations.
- Persona-verified 21+ age gate. Self-exclusion in one tap.
```

### Support URL
`https://app.oracleinsights.app/compliance`

### Marketing URL
`https://oracleinsights.app`

### Privacy Policy URL
`https://app.oracleinsights.app/privacy`

### EULA
Use Apple's standard EULA unless legal directs otherwise.

## App icon

1024×1024 PNG, no alpha, no rounded corners, no transparency. Generated via `pnpm icons` from `public/icon.svg`. Saved to `ios/OracleApp/AppIcon.appiconset/AppIcon-1024.png`.

## Versioning

| Field | Value |
|---|---|
| Marketing version | `0.1.0` (bump per submission) |
| Build number | monotonically increasing integer; CI-managed |

## Encryption

`ITSAppUsesNonExemptEncryption = false` (already set in `Info.plist`). Only TLS — no custom crypto in the app binary outside what iOS provides.
