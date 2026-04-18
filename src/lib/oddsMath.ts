import type { OddsQuote } from "@/types/oracle";

export function americanToDecimal(american: number): number {
  return american >= 100
    ? american / 100 + 1
    : 100 / Math.abs(american) + 1;
}

export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

export function americanToImpliedProb(american: number): number {
  const decimal = americanToDecimal(american);
  return 1 / decimal;
}

export function buildQuote(american: number): OddsQuote {
  const decimal = americanToDecimal(american);
  return { americanOdds: american, decimalOdds: decimal, impliedProb: 1 / decimal };
}

export function devigTwoWay(pA: number, pB: number): [number, number] {
  const sum = pA + pB;
  if (sum <= 0) return [0, 0];
  return [pA / sum, pB / sum];
}

export function devigPowerMethod(probs: number[], k = 1.05): number[] {
  const raised = probs.map(p => Math.pow(p, k));
  const s = raised.reduce((a, b) => a + b, 0);
  return raised.map(p => p / s);
}

export function closingLineValue(entryAmerican: number, closingAmerican: number): number {
  const entryProb = americanToImpliedProb(entryAmerican);
  const closeProb = americanToImpliedProb(closingAmerican);
  return closeProb - entryProb;
}

export function expectedValue(trueProb: number, decimalOdds: number): number {
  return trueProb * (decimalOdds - 1) - (1 - trueProb);
}

export function edge(trueProb: number, impliedProb: number): number {
  return trueProb - impliedProb;
}
