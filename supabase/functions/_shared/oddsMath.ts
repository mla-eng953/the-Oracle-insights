export function americanToDecimal(a: number): number {
  return a >= 100 ? a / 100 + 1 : 100 / Math.abs(a) + 1;
}
export function americanToImpliedProb(a: number): number {
  return 1 / americanToDecimal(a);
}
export function decimalToAmerican(d: number): number {
  if (d <= 1) return 0;
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}
export function devigTwoWay(pA: number, pB: number): [number, number] {
  const s = pA + pB;
  return s > 0 ? [pA / s, pB / s] : [0, 0];
}
export function devigPower(probs: number[], k = 1.05): number[] {
  const raised = probs.map(p => Math.pow(p, k));
  const s = raised.reduce((a, b) => a + b, 0);
  return raised.map(p => p / s);
}
