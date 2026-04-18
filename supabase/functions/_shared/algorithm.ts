// Server-side Oracle fair-price and edge engine.
// Replaces the client-hash "integrity" theater with real server-side enforcement.
// Weights are per-sport and loaded from model_weights; this file is the structural core.

import { americanToImpliedProb, devigTwoWay } from "./oddsMath.ts";

export interface BookQuote {
  book: string;
  sharpWeight: number;
  home?: number;
  away?: number;
  over?: number;
  under?: number;
}

export interface SignalInput {
  kind: string;
  prob?: number;
  sentiment?: "bullish" | "bearish" | "neutral";
  weight?: number;
  label: string;
  value?: string | number;
  detail?: string;
}

export interface FairPriceInput {
  books: BookQuote[];
  signalMarketProb?: number;
  newsSentimentZ?: number;
  injuryDelta?: number;
  weatherDelta?: number;
  situationalDelta?: number;
  perSportWeights: { sharp: number; signal: number; news: number };
}

export interface FairPriceResult {
  sharpConsensus: number;
  signalProb: number;
  trueProb: number;
  trueProbLow: number;
  trueProbHigh: number;
}

/**
 * Fair-price synthesis (home/away, over/under etc — generic two-way).
 * - Weighted devig across sharp books.
 * - Blend with prediction-market probability via per-sport learned weights.
 * - Apply narrow bounds from news/injury/weather/situational.
 * - Bootstrap CI using book-disagreement std dev as proxy.
 */
export function computeFairPrice(input: FairPriceInput): FairPriceResult {
  const probs = input.books.map(b => {
    if (b.home != null && b.away != null) {
      const [pH, _pA] = devigTwoWay(americanToImpliedProb(b.home), americanToImpliedProb(b.away));
      return { p: pH, w: b.sharpWeight };
    }
    if (b.over != null && b.under != null) {
      const [pO, _pU] = devigTwoWay(americanToImpliedProb(b.over), americanToImpliedProb(b.under));
      return { p: pO, w: b.sharpWeight };
    }
    return null;
  }).filter((v): v is { p: number; w: number } => v != null);

  if (probs.length === 0) {
    return { sharpConsensus: 0, signalProb: input.signalMarketProb ?? 0, trueProb: 0, trueProbLow: 0, trueProbHigh: 0 };
  }

  const wSum = probs.reduce((a, b) => a + b.w, 0);
  const sharp = probs.reduce((a, b) => a + b.p * b.w, 0) / wSum;

  const signal = input.signalMarketProb ?? sharp;
  const w = input.perSportWeights;
  const wTot = w.sharp + w.signal + w.news;
  const blended =
    (w.sharp * sharp +
      w.signal * signal +
      w.news * (input.newsSentimentZ != null ? clamp(sharp + 0.01 * input.newsSentimentZ, 0.02, 0.98) : sharp)) /
    wTot;

  const delta = (input.injuryDelta ?? 0) + (input.weatherDelta ?? 0) + (input.situationalDelta ?? 0);
  const trueProb = clamp(blended + delta, 0.02, 0.98);

  // Bootstrap-proxy CI: std dev of book probabilities + fixed uncertainty floor.
  const variance = probs.reduce((a, b) => a + (b.p - sharp) ** 2 * b.w, 0) / wSum;
  const sd = Math.sqrt(variance);
  const ci = Math.max(0.01, sd * 1.96 + 0.008);

  return {
    sharpConsensus: sharp,
    signalProb: signal,
    trueProb,
    trueProbLow: clamp(trueProb - ci, 0, 1),
    trueProbHigh: clamp(trueProb + ci, 0, 1),
  };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export interface EdgeResult {
  edge: number;
  edgeLow: number;
  edgeHigh: number;
  confidence: number;
  ciCrossesZero: boolean;
}

export function computeEdge(trueProb: number, trueLow: number, trueHigh: number, marketAmerican: number): EdgeResult {
  const implied = americanToImpliedProb(marketAmerican);
  const edge = trueProb - implied;
  const edgeLow = trueLow - implied;
  const edgeHigh = trueHigh - implied;
  const confidence = Math.round(Math.min(95, Math.max(0, 55 + edge * 400 - (edgeHigh - edgeLow) * 100)));
  return { edge, edgeLow, edgeHigh, confidence, ciCrossesZero: edgeLow < 0 && edgeHigh > 0 };
}

export interface PickSizing {
  suggestedFractionalKelly: number;
  suggestedUnitStake: number;
}

/**
 * Default pre-personalization sizing. Final stake is re-computed per-user in
 * the UI from their StrategyProfile; this gives a sensible default unit count.
 */
export function defaultSizing(trueProb: number, american: number): PickSizing {
  const dec = americanToDecimal(american);
  const b = dec - 1;
  if (b <= 0) return { suggestedFractionalKelly: 0, suggestedUnitStake: 0 };
  const full = (trueProb * (b + 1) - 1) / b;
  const quarter = Math.max(0, full * 0.25);
  const capped = Math.min(quarter, 0.03);
  const units = Math.round(capped * 100) / 1;
  return { suggestedFractionalKelly: capped, suggestedUnitStake: Math.max(0.5, units) };
}

function americanToDecimal(a: number): number {
  return a >= 100 ? a / 100 + 1 : 100 / Math.abs(a) + 1;
}

/**
 * Tier assignment. Confidence + edge-magnitude drive the bucket.
 * Pure function — easy to unit-test and swap.
 */
export function assignTier(edge: number, confidence: number): "conservative" | "moderate" | "aggressive" {
  if (confidence >= 75 && edge >= 0.03) return "conservative";
  if (confidence >= 65 && edge >= 0.04) return "moderate";
  return "aggressive";
}

/**
 * Filters replace the old hard-coded "disable NHL totals entirely" logic.
 * Every filter is edge-based and data-driven, not cohort-based.
 */
export function shouldSurface(args: {
  edge: number;
  edgeLow: number;
  confidence: number;
  sport: string;
  betType: string;
  american: number;
}): boolean {
  if (args.confidence < 55) return false;
  if (args.edgeLow < -0.005) return false; // CI basically crosses zero.
  if (args.edge < 0.02) return false;
  if (args.betType === "moneyline" && args.sport === "MLB") {
    if (args.american < 110 && args.edge < 0.05) return false; // value dog discipline.
  }
  if (args.betType === "player_prop" && args.edge < 0.04) return false;
  return true;
}
