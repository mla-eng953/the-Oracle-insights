import type { BetType, RiskTier, Sport } from "./oracle";

export interface StrategyProfile {
  id: string;
  userId: string;
  name: string;
  bankrollUsd: number;
  unitSizeUsd: number;
  kellyFraction: number;
  maxPerPickPctBankroll: number;
  maxConcurrentExposurePct: number;
  minEdgePct: number;
  minConfidence: number;
  allowedSports: Sport[];
  allowedBetTypes: BetType[];
  allowedTiers: RiskTier[];
  autoTrack: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_STRATEGY: Omit<StrategyProfile, "id" | "userId" | "createdAt" | "updatedAt"> = {
  name: "Default",
  bankrollUsd: 1000,
  unitSizeUsd: 10,
  kellyFraction: 0.25,
  maxPerPickPctBankroll: 3,
  maxConcurrentExposurePct: 25,
  minEdgePct: 2,
  minConfidence: 60,
  allowedSports: ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "MLS", "EPL", "UFC"],
  allowedBetTypes: ["moneyline", "spread", "total", "player_prop", "nrfi"],
  allowedTiers: ["conservative", "moderate", "aggressive"],
  autoTrack: false,
};
