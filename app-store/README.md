# App Store production-readiness pack

Read top-to-bottom. Every doc is a checklist; nothing is optional.

| Doc | Purpose |
|---|---|
| [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) | The single page someone shipping production should hold open. |
| [METADATA.md](METADATA.md) | Exact App Store Connect copy. |
| [REVIEW_NOTES.md](REVIEW_NOTES.md) | What to paste into the App Review Information field. |
| [PRIVACY_LABEL.md](PRIVACY_LABEL.md) | Privacy Nutrition Label answers + the `PrivacyInfo.xcprivacy` file. |
| [SCREENSHOTS.md](SCREENSHOTS.md) | Required sizes, story arc, content rules. |
| [SECRETS.md](SECRETS.md) | Every secret, where it comes from, where it goes. |

## Quick commands

```sh
pnpm icons               # regenerate every PNG icon
pnpm fetch-apple-ca      # populate apple-root-ca.json
deno run -A scripts/backtest.ts --start 2025-01-01
cd ios && xcodegen generate
```
