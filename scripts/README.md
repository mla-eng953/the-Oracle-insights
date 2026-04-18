# Scripts

## backtest.ts

Walk-forward backtest of the Oracle algorithm against settled picks + closing lines.

### Run

```sh
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...

deno run -A scripts/backtest.ts \
  --start 2025-07-01 \
  --end 2026-04-01 \
  --sport NBA \
  --bet-type moneyline \
  --bankroll 10000 \
  --kelly 0.25
```

### Flags

| flag | default | notes |
|---|---|---|
| `--start` | `2025-01-01` | ISO date |
| `--end` | today | ISO date |
| `--sport` | `all` | `NBA`, `NFL`, etc. |
| `--bet-type` | `all` | `moneyline`, `spread`, `total`, `player_prop` |
| `--bankroll` | `10000` | USD |
| `--kelly` | `0.25` | fraction |
| `--max-per-pick` | `3` | % bankroll cap |

### What you should care about

1. **CLV t-stat.** Look for `t > 2` before claiming edge. Under that it's noise.
2. **CLV crosses zero in CI?** Sample is too small or the model is not beating the close.
3. **Walk-forward buckets.** Monthly CLV trending down = model drift, retrain the weights.

### What NOT to use this for

- Comparing two strategies on overlapping windows — use a separate `champion-vs-challenger.ts`.
- Small-sample hot takes. 100 picks is noise.
- Public marketing claims — those require an external audit.
