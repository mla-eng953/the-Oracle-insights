// Parlay simulation. Independent legs collapse to the analytic product;
// correlated legs (same-game props) are simulated via a Gaussian-copula
// Monte Carlo so combined-true-prob respects the dependence structure.

import type { Pick } from "@/types/oracle";
import { decimalToAmerican } from "./oddsMath";

export interface ParlaySimulationInput {
  picks: Pick[];
  correlationMatrix?: number[][];
  iterations?: number;
}

export interface ParlaySimulationResult {
  combinedDecimalOdds: number;
  combinedAmericanOdds: number;
  impliedProb: number;
  trueProb: number;
  edge: number;
  ev: number;
  iterations: number;
  legHits: number[];
  warnings: string[];
}

const DEFAULT_ITER = 20_000;

export function simulateParlay(input: ParlaySimulationInput): ParlaySimulationResult {
  const { picks } = input;
  const n = picks.length;
  const warnings: string[] = [];

  if (n < 2) {
    warnings.push("Parlay requires ≥ 2 legs.");
  }

  const combinedDecimal = picks.reduce((acc, p) => acc * p.odds.decimalOdds, 1);
  const impliedProb = picks.reduce((acc, p) => acc * p.odds.impliedProb, 1);

  // Default correlation: identity (independent). Same-match legs auto-correlate
  // 0.4 unless a matrix was provided — a conservative approximation.
  const corr = input.correlationMatrix ?? defaultCorrelation(picks, warnings);

  const iterations = Math.max(1000, input.iterations ?? DEFAULT_ITER);
  const trueProbs = picks.map(p => p.edge.trueProb);

  let hits = 0;
  const legHits = new Array(n).fill(0);
  // Cholesky factor cached once.
  const L = cholesky(corr);

  for (let it = 0; it < iterations; it++) {
    const z = sampleStdNormalVector(n);
    const corrZ = matVec(L, z);

    let allHit = true;
    for (let i = 0; i < n; i++) {
      // Inverse-normal CDF threshold so each leg has marginal P = trueProbs[i].
      const threshold = inverseNormalCdf(trueProbs[i]);
      const hit = corrZ[i] <= threshold;
      if (hit) legHits[i]++;
      else allHit = false;
    }
    if (allHit) hits++;
  }

  const trueProb = hits / iterations;
  const edge = trueProb - impliedProb;
  const ev = trueProb * (combinedDecimal - 1) - (1 - trueProb);

  return {
    combinedDecimalOdds: combinedDecimal,
    combinedAmericanOdds: decimalToAmerican(combinedDecimal),
    impliedProb,
    trueProb,
    edge,
    ev,
    iterations,
    legHits,
    warnings,
  };
}

function defaultCorrelation(picks: Pick[], warnings: string[]): number[][] {
  const n = picks.length;
  const M: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) M[i][i] = 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (picks[i].matchId === picks[j].matchId) {
        M[i][j] = M[j][i] = 0.4;
        warnings.push(`Same-match legs detected (${picks[i].selectionLabel} & ${picks[j].selectionLabel}); applied 0.4 correlation. Provide a measured correlationMatrix for accuracy.`);
      }
    }
  }
  return M;
}

function cholesky(M: number[][]): number[][] {
  const n = M.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const v = M[i][i] - sum;
        L[i][j] = v > 0 ? Math.sqrt(v) : 0;
      } else if (L[j][j] !== 0) {
        L[i][j] = (M[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

function matVec(L: number[][], v: number[]): number[] {
  const out = new Array(L.length).fill(0);
  for (let i = 0; i < L.length; i++) {
    let s = 0;
    for (let j = 0; j <= i; j++) s += L[i][j] * v[j];
    out[i] = s;
  }
  return out;
}

function sampleStdNormalVector(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(boxMuller());
  return out;
}

function boxMuller(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Beasley-Springer-Moro inverse standard-normal CDF approximation.
 * Accurate to ~1e-7 — overkill for our needs, plenty fast.
 */
function inverseNormalCdf(p: number): number {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
