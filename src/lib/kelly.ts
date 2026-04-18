export interface StakeInput {
  trueProb: number;
  decimalOdds: number;
  bankrollUsd: number;
  kellyFraction: number;
  maxPerPickPctBankroll: number;
  minStakeUsd?: number;
}

export interface StakeResult {
  fullKellyFraction: number;
  fractionalKellyFraction: number;
  cappedFraction: number;
  stakeUsd: number;
  units: number;
}

export function kellyStake(input: StakeInput, unitSizeUsd: number): StakeResult {
  const { trueProb, decimalOdds, bankrollUsd, kellyFraction, maxPerPickPctBankroll } = input;
  const b = decimalOdds - 1;
  if (b <= 0 || trueProb <= 0 || trueProb >= 1) {
    return { fullKellyFraction: 0, fractionalKellyFraction: 0, cappedFraction: 0, stakeUsd: 0, units: 0 };
  }
  const full = (trueProb * (b + 1) - 1) / b;
  const fractional = Math.max(0, full * kellyFraction);
  const cap = maxPerPickPctBankroll / 100;
  const capped = Math.min(fractional, cap);
  const stakeUsd = Math.max(input.minStakeUsd ?? 0, Math.round(capped * bankrollUsd * 100) / 100);
  const units = unitSizeUsd > 0 ? stakeUsd / unitSizeUsd : 0;
  return { fullKellyFraction: full, fractionalKellyFraction: fractional, cappedFraction: capped, stakeUsd, units };
}
