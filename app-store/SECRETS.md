# Production secrets — where each value lives

Vault references below assume 1Password. Adapt to your secret manager. Never paste a value here. Anyone bringing up production should be able to walk this list top-to-bottom and check each row off.

## Supabase project

| Key | Source | Where it goes | Notes |
|---|---|---|---|
| `SUPABASE_URL` | Supabase dashboard → Settings → API | Cloudflare Worker, scripts | Public. |
| `SUPABASE_ANON_KEY` | same | `VITE_SUPABASE_ANON_KEY` (web), iOS plist if needed | Public. |
| `SUPABASE_SERVICE_ROLE_KEY` | same — **never to client** | Cloudflare Worker secret, scripts vault, Supabase fn env | Treat as god-mode. |
| `app.settings.supabase_url` / `app.settings.service_role_key` | as above | `alter database postgres set ...` | Used by the pg_cron failover invoker. |

## Sportsbook & market data

| Key | Source | Where |
|---|---|---|
| `ODDS_API_KEY` | the-odds-api.com dashboard | Supabase functions env |
| `KALSHI_API_KEY` | Kalshi developer portal | Supabase functions env |

## AI

| Key | Source | Where |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Supabase functions env (only if you re-enable LLM rationale generation) |

## Stripe (web subscriptions)

| Key | Source | Where |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys | Supabase fn env |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → endpoint signing secret | Supabase fn env |
| `STRIPE_PRICE_PRO` | Stripe dashboard → Products | Supabase fn env |
| `STRIPE_PRICE_ELITE` | Stripe dashboard → Products | Supabase fn env |
| `SITE_URL` | constant | Supabase fn env |

Also configure in Stripe:
- Webhook endpoint pointing at `${SUPABASE_URL}/functions/v1/stripe-webhook`.
- Allowed events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.

## Apple App Store Server (iOS subscriptions)

| Key | Source | Where |
|---|---|---|
| `APPLE_ISSUER_ID` | App Store Connect → Users and Access → Keys → App Store Server | Supabase fn env |
| `APPLE_KEY_ID` | same | Supabase fn env |
| `APPLE_PRIVATE_KEY` | downloaded `.p8` file (keep ONE secure copy) | Supabase fn env (PEM contents) |
| `APPLE_VERIFY_CHAIN` | constant `1` for prod, `0` for sandbox | Supabase fn env |

Also configure in App Store Connect:
- Server Notifications V2 URL → `${SUPABASE_URL}/functions/v1/apple-webhook`.
- Production and Sandbox environments both need the URL.
- Run `pnpm fetch-apple-ca` to populate `apple-root-ca.json` before flipping `APPLE_VERIFY_CHAIN=1`.

## APNs (iOS push)

| Key | Source | Where |
|---|---|---|
| `APNS_KEY_ID` | Apple Developer → Certificates, Identifiers & Profiles → Keys | Supabase fn env |
| `APNS_TEAM_ID` | same | Supabase fn env |
| `APNS_PRIVATE_KEY` | downloaded `.p8` | Supabase fn env |
| `APNS_BUNDLE_ID` | constant `app.oracleinsights.OracleApp` | Supabase fn env |
| `APNS_PRODUCTION` | `1` for prod | Supabase fn env |

You can reuse the same `.p8` Apple key across APNs and StoreKit if it has both capabilities; recommend separate keys.

## Web Push (VAPID)

Generate once with `web-push generate-vapid-keys`. Persist forever — rotating invalidates every existing subscription.

| Key | Where |
|---|---|
| `VAPID_PUBLIC_KEY` | Supabase fn env, mirror to `VITE_VAPID_PUBLIC_KEY` |
| `VAPID_PRIVATE_KEY` | Supabase fn env only |
| `VAPID_SUBJECT` | constant, e.g. `mailto:ops@oracleinsights.app` |

## Persona

| Key | Source | Where |
|---|---|---|
| `PERSONA_API_KEY` | Persona dashboard → API keys | Supabase fn env |
| `PERSONA_TEMPLATE_ID` | Persona dashboard → Inquiry templates | Supabase fn env |
| `PERSONA_WEBHOOK_SECRET` | Persona dashboard → Webhooks | Supabase fn env |

Webhook URL → `${SUPABASE_URL}/functions/v1/persona-webhook`.

## MaxMind

| Key | Source | Where |
|---|---|---|
| `MAXMIND_ACCOUNT_ID` | MaxMind portal | Supabase fn env |
| `MAXMIND_LICENSE_KEY` | MaxMind portal | Supabase fn env |
| `COMPLIANCE_BLOCK_ANONYMIZERS` | constant `1` | Supabase fn env |

## FingerprintJS Pro

| Key | Source | Where |
|---|---|---|
| `FINGERPRINT_API_KEY` | FingerprintJS dashboard → API keys → secret | Supabase fn env |
| `FINGERPRINT_REGION` | `us` / `eu` / `ap` | Supabase fn env |
| `MAX_ACCOUNTS_PER_FINGERPRINT` | constant `3` | Supabase fn env |
| `FINGERPRINT_WINDOW_DAYS` | constant `30` | Supabase fn env |
| `VITE_FINGERPRINT_PUBLIC_KEY` | dashboard → API keys → public | Web build env |
| `VITE_FINGERPRINT_REGION` | mirror | Web build env |

## BetterStack (logs)

| Key | Source | Where |
|---|---|---|
| `BETTERSTACK_SOURCE_TOKEN` | BetterStack → Sources | Supabase fn env |
| `BETTERSTACK_HOST` | constant `https://in.logs.betterstack.com` | Supabase fn env |

## Sentry / PostHog (telemetry)

| Key | Source | Where |
|---|---|---|
| `VITE_SENTRY_DSN` | Sentry → Project → Client Keys | Web build env |
| `VITE_POSTHOG_KEY` | PostHog → Project | Web build env |
| `VITE_POSTHOG_HOST` | mirror | Web build env |

## Cloudflare Worker (cron)

```sh
cd cloudflare
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ALERT_WEBHOOK_URL
```

## Final sanity script

After populating everything, run:

```sh
deno run -A scripts/backtest.ts --start 2025-01-01 --sport NBA --bet-type all
```

If this prints data without "Missing env" errors, all Supabase service-role secrets are wired correctly.
