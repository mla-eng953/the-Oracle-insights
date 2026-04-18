import { americanToImpliedProb } from "./oddsMath";

export interface CLVPoint {
  pickId: string;
  settledAt: string;
  clv: number;
  entryAmerican: number;
  closingAmerican: number;
  result: "win" | "loss" | "push" | "void";
}

export interface CLVSummary {
  n: number;
  meanClv: number;
  medianClv: number;
  beatClosePct: number;
  stdErr: number;
  tStat: number;
}

export function clvForPick(entryAmerican: number, closingAmerican: number): number {
  return americanToImpliedProb(closingAmerican) - americanToImpliedProb(entryAmerican);
}

export function summarize(points: CLVPoint[]): CLVSummary {
  const n = points.length;
  if (n === 0) return { n: 0, meanClv: 0, medianClv: 0, beatClosePct: 0, stdErr: 0, tStat: 0 };
  const clvs = points.map(p => p.clv).sort((a, b) => a - b);
  const mean = clvs.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 1 ? clvs[(n - 1) / 2] : (clvs[n / 2 - 1] + clvs[n / 2]) / 2;
  const variance = clvs.reduce((acc, c) => acc + (c - mean) ** 2, 0) / Math.max(1, n - 1);
  const stdErr = Math.sqrt(variance / n);
  const beat = clvs.filter(c => c > 0).length / n;
  const tStat = stdErr > 0 ? mean / stdErr : 0;
  return { n, meanClv: mean, medianClv: median, beatClosePct: beat, stdErr, tStat };
}

/**
 * CLV in basis points: stable and readable across sports/markets.
 * Positive BP = beating the close on average.
 */
export function toBasisPoints(clv: number): number {
  return Math.round(clv * 10000);
}
