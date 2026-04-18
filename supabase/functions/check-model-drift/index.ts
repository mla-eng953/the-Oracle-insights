// Weekly model-drift detector. For each sport with sufficient sample size,
// compares the trailing 30-day CLV distribution against the prior 30-day
// window. Welch's t-test with Holm-Bonferroni multiple-comparison correction.
//
// Alert if the corrected p-value < 0.05 AND the mean shift exceeds 50 bp.
// Emits to BetterStack and to ALERT_WEBHOOK_URL (Slack/Discord style payload).
//
// Run via Cloudflare Cron Triggers Mondays 06:00 ET.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";

const ALERT_WEBHOOK = Deno.env.get("ALERT_WEBHOOK_URL");
const MIN_SAMPLE = 30;
const SIGNIFICANCE = 0.05;
const MIN_BP_SHIFT = 50;

interface ClvRow { sport: string; clv: number | null; settled_at: string }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const log = createLogger("check-model-drift");

  try {
    const supabase = adminClient();
    const now = Date.now();
    const cutoff60 = new Date(now - 60 * 86400_000).toISOString();
    const cutoff30 = new Date(now - 30 * 86400_000).toISOString();

    const { data, error } = await supabase
      .from("closing_odds_join")
      .select("sport, clv, settled_at")
      .gte("settled_at", cutoff60)
      .not("clv", "is", null);
    if (error) throw error;

    const rows = (data ?? []) as ClvRow[];
    const bySport = new Map<string, { recent: number[]; prior: number[] }>();
    for (const r of rows) {
      if (r.clv == null) continue;
      const bp = r.clv * 10_000;
      const bucket = r.settled_at >= cutoff30 ? "recent" : "prior";
      const entry = bySport.get(r.sport) ?? { recent: [], prior: [] };
      entry[bucket].push(bp);
      bySport.set(r.sport, entry);
    }

    const findings: Finding[] = [];
    for (const [sport, { recent, prior }] of bySport) {
      if (recent.length < MIN_SAMPLE || prior.length < MIN_SAMPLE) continue;
      const t = welchT(recent, prior);
      const p = approxPValueTwoTailed(t, welchDf(recent, prior));
      const meanShift = mean(recent) - mean(prior);
      findings.push({ sport, n_recent: recent.length, n_prior: prior.length,
        mean_recent_bp: mean(recent), mean_prior_bp: mean(prior),
        mean_shift_bp: meanShift, t, p });
    }

    // Holm-Bonferroni correction.
    const sorted = [...findings].sort((a, b) => a.p - b.p);
    const m = sorted.length;
    let alerts: Finding[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const corrected = sorted[i].p * (m - i);
      if (corrected < SIGNIFICANCE && Math.abs(sorted[i].mean_shift_bp) >= MIN_BP_SHIFT) {
        alerts.push({ ...sorted[i], p_corrected: corrected });
      } else {
        break;
      }
    }

    log.info("scan_complete", { sports: bySport.size, alerts: alerts.length });

    if (alerts.length > 0 && ALERT_WEBHOOK) {
      const text = formatAlert(alerts);
      await fetch(ALERT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    }

    await log.flush();
    return jsonResponse({ ok: true, findings, alerts });
  } catch (err) {
    log.error("failed", { error: (err as Error).message });
    await log.flush();
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

interface Finding {
  sport: string;
  n_recent: number; n_prior: number;
  mean_recent_bp: number; mean_prior_bp: number;
  mean_shift_bp: number;
  t: number; p: number;
  p_corrected?: number;
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function variance(xs: number[]): number {
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1);
}
function welchT(a: number[], b: number[]): number {
  const ma = mean(a), mb = mean(b);
  const va = variance(a), vb = variance(b);
  return (ma - mb) / Math.sqrt(va / a.length + vb / b.length);
}
function welchDf(a: number[], b: number[]): number {
  const va = variance(a) / a.length, vb = variance(b) / b.length;
  return ((va + vb) ** 2) / ((va * va) / (a.length - 1) + (vb * vb) / (b.length - 1));
}

/**
 * Two-tailed p-value via the t-distribution survival function.
 * Approximation good for df > 5; we always have df > 30 in practice.
 */
function approxPValueTwoTailed(t: number, df: number): number {
  // Wilson-Hilferty + small-df correction.
  const x = df / (t * t + df);
  const cdfOneTail = 0.5 * incompleteBeta(df / 2, 0.5, x);
  return 2 * Math.min(cdfOneTail, 1 - cdfOneTail);
}

function incompleteBeta(a: number, b: number, x: number): number {
  // Numerically stable continued fraction (Lentz). Sufficient for our purposes.
  if (x < 0 || x > 1) return 0;
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  let f = 1, c = 1, d = 0;
  for (let m = 0; m < 200; m++) {
    const numer = m === 0 ? 1 : m % 2 === 0
      ? (m / 2) * (b - m / 2) * x / ((a + m - 1) * (a + m))
      : -((a + (m - 1) / 2) * (a + b + (m - 1) / 2) * x) / ((a + m - 1) * (a + m));
    d = 1 + numer * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numer / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return front * (f - 1);
}

function lnGamma(z: number): number {
  // Lanczos approximation.
  const g = 7;
  const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function formatAlert(alerts: Finding[]): string {
  const lines = alerts.map(a =>
    `*${a.sport}* shift ${a.mean_shift_bp.toFixed(1)}bp (${a.mean_prior_bp.toFixed(1)} → ${a.mean_recent_bp.toFixed(1)}), p=${(a.p_corrected ?? a.p).toExponential(2)}, n_recent=${a.n_recent}`
  );
  return [
    "🚨 Oracle model drift detected",
    ...lines,
    "Action: walk-forward backtest the affected sport(s) and consider rolling back model_version.",
  ].join("\n");
}
