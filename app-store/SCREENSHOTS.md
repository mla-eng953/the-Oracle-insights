# Screenshots — required sizes & content brief

Apple requires screenshots in at least one of: 6.9", 6.7", 6.5". Provide all
three so they look right on every device. iPad set is required separately
if you target iPad. We're iPhone-only (`TARGETED_DEVICE_FAMILY: "1"`) so
ignore iPad.

## Required iPhone sets

| Display | Resolution (px) | Devices | Required? |
|---|---|---|---|
| 6.9" | 1290 × 2796 | iPhone 16 Pro Max, 15 Pro Max | **Yes** |
| 6.7" | 1290 × 2796 | iPhone 14/13/12 Pro Max, 15 Plus | inherits 6.9" if not provided |
| 6.5" | 1284 × 2778 | iPhone 14/13/12 Pro Max | inherits 6.9" |
| 5.5" | 1242 × 2208 | iPhone 8 Plus | optional unless you support older devices |

10 screenshots max per locale. We submit 5.

## Story arc — 5 screenshots in this order

| # | Title overlay | Background | Hero element | Why |
|---|---|---|---|---|
| 1 | "Edge, not vibes." | Home dashboard | CLV chart + edge tile | Lead with the differentiator. |
| 2 | "Every pick shows the math." | Pick details | Confidence-interval edge display | Reinforce transparency. |
| 3 | "Bankroll that respects you." | Strategy profile editor | Kelly slider + per-pick cap | Responsible-gambling positioning. |
| 4 | "Shop the line." | Market Intel — Shop tab | Best-line callout | Concrete utility. |
| 5 | "21+. Entertainment only." | Compliance page | RG controls | Apple-friendly responsible-use story. |

## Asset production

Use the Xcode Simulator with the built app loaded:

```sh
xcrun simctl boot "iPhone 16 Pro Max"
xcrun simctl install booted ./build/OracleApp.app
xcrun simctl launch booted app.oracleinsights.OracleApp
xcrun simctl io booted screenshot ./screens/01-home.png
# Repeat for each screen.
```

Then run them through a frame generator (Fastlane Frameit, Screenshot.rocks,
or Figma) to add the marketing copy overlays in the table above.

Output to `app-store/screenshots/iphone-6.9/01.png` … `05.png` and upload to
App Store Connect.

## Content checklist per screenshot

- [ ] Status bar shows full battery, full bars, real time `9:41`.
- [ ] No personal data visible — use the demo account or fixture data.
- [ ] No third-party logos (sportsbooks, Kalshi, Stripe, etc.).
- [ ] Responsible-gambling banner visible (1-800-GAMBLER) — Apple notices
      its absence.
- [ ] Numbers are realistic but not implausibly profitable. CLV +18bp is
      believable; "+800%" gets you rejected.
- [ ] No promotional copy outside the title overlay — the App Store
      generates the rest.
