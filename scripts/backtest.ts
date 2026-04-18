#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * Walk-forward backtest for the Oracle algorithm.
 *
 * Usage:
 *   deno run -A scripts/backtest.ts \
 *     --start 2025-07-01 --end 2026-04-01 \
 *     --sport NBA --bet-type all \
 *     --bankroll 10000 --kelly 0.25
 *
 * Produces:
 *   - CLV summary (mean bp, t-stat, beat-close %)
 *   - Unit P&L + ROI + 95% CI
 *   - Per-sport / per-bet-type breakdown
 *   - Walk-forward buckets (monthly) to detect regime shifts
 *
 * Reads from Supabase using SERVICE ROLE — do NOT run from production terminals
 * without care. Prefer running against a read replica if one exists.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const args = parseArgs(Deno.args);
const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

const start = args.start ?? "2025-01-01";
const end = args.end ?? new Date().toISOString().slice(0, 10);
const sportFilter = args.sport ?? "all";
const betTypeFilter = args["bet-type"] ?? "all";
const bankroll = Number(args.bankroll ?? 10_000);
const kellyFraction = Number(args.kelly ?? 0.25);
const maxPerPickPct = Number(args["max-per-pick"] ?? 3);

interface Row {
  pick_id: string;
  sport: string;
  bet_type: string;
  tier: string;
  entry_american: number;
  closing_american: number | null;
  clv: number | null;
  result: "win" | "loss" | "push" | "void" | null;
  settled_at: string | null;
  true_prob: number;
  confidence: number;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let q = supabase
    .from("closing_odds_join")
    .select("pick_id, sport, bet_type, tier, entry_american, closing_american, clv, result, settled_at, picks!inner(true_prob, confidence)")
    .gte("settled_at", start)
    .lte("settled_at", end);
  if (sportFilter !== "all") q = q.eq("sport", sportFilter);
  if (betTypeFilter !== "all") q = q.eq("bet_type", betTypeFilter);

  const { data, error } = await q;
  if (error) { console.error(error); Deno.exit(1); }
  const rows: Row[] = (data ?? []).map((r: Record<string, unknown> & { picks: { true_prob: number; confidence: number } }) => ({
    pick_id: r.pick_id as string,
    sport: r.sport as string,
    bet_type: r.bet_type as string,
    tier: r.tier as string,
    entry_american: r.entry_american as number,
    closing_american: r.closing_american as number | null,
    clv: r.clv as number | null,
    result: r.result as Row["result"],
    settled_at: r.settled_at as string | null,
    true_prob: r.picks.true_prob,
    confidence: r.picks.confidence,
  }));

  if (rows.length === 0) {
    console.log("No settled picks in window.");
    return;
  }

  console.log(`\nOracle Backtest — ${start} → ${end}`);
  console.log(`Sport: ${sportFilter}  Bet type: ${betTypeFilter}`);
  console.log(`Bankroll: $${bankroll}  Kelly: ${kellyFraction}  Max/pick: ${maxPerPickPct}%`);
  console.log(`Graded picks: ${rows.length}\n`);

  reportClv(rows);
  reportPnl(rows);
  reportBreakdown(rows, "sport");
  reportBreakdown(rows, "bet_type");
  reportBreakdown(rows, "tier");
  reportWalkForward(rows);
}

function reportClv(rows: Row[]) {
  const withClv = rows.filter(r => r.clv != null) as (Row & { clv: number })[];
  if (withClv.length === 0) {
    console.log("CLV: no closing lines captured.");
    return;
  }
  const bps = withClv.map(r => r.clv * 10_000);
  const mean = avg(bps);
  const variance = bps.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, bps.length - 1);
  const stderr = Math.sqrt(variance / bps.length);
  const t = stderr > 0 ? mean / stderr : 0;
  const beat = withClv.filter(r => r.clv > 0).length / withClv.length;
  console.log("CLV");
  console.log(`  mean:       ${mean.toFixed(1)} bp`);
  console.log(`  median:     ${median(bps).toFixed(1)} bp`);
  console.log(`  t-stat:     ${t.toFixed(2)}`);
  console.log(`  beat-close: ${(beat * 100).toFixed(1)}%`);
  console.log(`  n:          ${withClv.length}\n`);
}

function reportPnl(rows: Row[]) {
  const settled = rows.filter(r => r.result && r.result !== "void");
  let units = 0, risk = 0;
  const perPickUnits: number[] = [];
  for (const r of settled) {
    const dec = americanToDecimal(r.entry_american);
    const full = ((r.true_prob * dec) - 1) / (dec - 1);
    const frac = Math.max(0, Math.min(maxPerPickPct / 100, full * kellyFraction));
    const stakeU = (frac * bankroll) / (bankroll / 100);
    risk += stakeU;
    let pnl = 0;
    if (r.result === "win") pnl = stakeU * (dec - 1);
    else if (r.result === "loss") pnl = -stakeU;
    units += pnl;
    perPickUnits.push(pnl);
  }
  const roi = risk > 0 ? units / risk : 0;
  // 95% CI on ROI via per-pick variance.
  const varPerPick = variance(perPickUnits) / Math.max(1, perPickUnits.length);
  const ciRoi = 1.96 * Math.sqrt(varPerPick) / Math.max(1, risk / perPickUnits.length);
  const wins = settled.filter(r => r.result === "win").length;
  const losses = settled.filter(r => r.result === "loss").length;
  const pushes = settled.filter(r => r.result === "push").length;
  console.log("P&L (unit-normalized)");
  console.log(`  record:     ${wins}-${losses}-${pushes}`);
  console.log(`  units:      ${units >= 0 ? "+" : ""}${units.toFixed(2)}u`);
  console.log(`  risk:       ${risk.toFixed(2)}u`);
  console.log(`  ROI:        ${(roi * 100).toFixed(2)}%  ± ${(ciRoi * 100).toFixed(2)}% (95%)`);
  console.log(`  CI crosses zero: ${roi - ciRoi < 0 && roi + ciRoi > 0 ? "YES — not yet significant" : "no"}\n`);
}

function reportBreakdown(rows: Row[], key: "sport" | "bet_type" | "tier") {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  console.log(`By ${key}`);
  for (const [k, arr] of [...groups.entries()].sort()) {
    const withClv = arr.filter(r => r.clv != null) as (Row & { clv: number })[];
    const meanBp = withClv.length ? avg(withClv.map(r => r.clv * 10_000)) : NaN;
    const wins = arr.filter(r => r.result === "win").length;
    const losses = arr.filter(r => r.result === "loss").length;
    console.log(`  ${k.padEnd(14)} n=${String(arr.length).padStart(4)}  ${wins}-${losses}  CLV ${Number.isFinite(meanBp) ? meanBp.toFixed(1).padStart(5) + "bp" : "  n/a"}`);
  }
  console.log();
}

function reportWalkForward(rows: Row[]) {
  const buckets = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.settled_at) continue;
    const bucket = r.settled_at.slice(0, 7);
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(r);
  }
  console.log("Walk-forward (monthly)");
  for (const [bucket, arr] of [...buckets.entries()].sort()) {
    const withClv = arr.filter(r => r.clv != null) as (Row & { clv: number })[];
    const meanBp = withClv.length ? avg(withClv.map(r => r.clv * 10_000)) : NaN;
    console.log(`  ${bucket}  n=${String(arr.length).padStart(4)}  CLV ${Number.isFinite(meanBp) ? meanBp.toFixed(1).padStart(5) + "bp" : "  n/a"}`);
  }
  console.log();
}

// Helpers ----------------------------------------------------------------

function americanToDecimal(a: number): number {
  return a >= 100 ? a / 100 + 1 : 100 / Math.abs(a) + 1;
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  return xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 === 1 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function env(key: string): string {
  const v = Deno.env.get(key);
  if (!v) { console.error(`Missing env ${key}`); Deno.exit(1); }
  return v;
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) { out[key] = next; i++; }
      else { out[key] = "true"; }
    }
  }
  return out;
}

await main();
