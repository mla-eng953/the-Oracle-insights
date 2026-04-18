export type Sport =
  | "NFL" | "NBA" | "MLB" | "NHL"
  | "NCAAF" | "NCAAB"
  | "MLS" | "EPL" | "LALIGA" | "SERIEA"
  | "UFC" | "TENNIS" | "GOLF";

export type RiskTier = "conservative" | "moderate" | "aggressive";

export type BetType =
  | "moneyline" | "spread" | "total"
  | "1h_moneyline" | "1h_spread" | "1h_total"
  | "2h_moneyline" | "2h_spread" | "2h_total"
  | "q1_moneyline" | "q1_spread" | "q1_total"
  | "player_prop" | "parlay" | "nrfi";

export type MarketSide = "over" | "under" | "home" | "away" | "yes" | "no";

export type PickStatus =
  | "pending" | "live" | "won" | "lost" | "push" | "void";

export type SignalKind =
  | "edge" | "sentiment" | "news" | "line_movement"
  | "consensus" | "volume" | "steam_move" | "rlm"
  | "sharp_aligned" | "public_fade" | "injury" | "weather";

export type SignalSentiment = "bullish" | "bearish" | "neutral";

export interface Signal {
  kind: SignalKind;
  label: string;
  value?: string | number;
  sentiment: SignalSentiment;
  source?: string;
  detail?: string;
  weight: number;
}

export interface OddsQuote {
  americanOdds: number;
  decimalOdds: number;
  impliedProb: number;
}

export interface EdgeEstimate {
  trueProb: number;
  trueProbLow: number;
  trueProbHigh: number;
  edge: number;
  edgeLow: number;
  edgeHigh: number;
  confidence: number;
}

export interface Match {
  id: string;
  sport: Sport;
  league?: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: string;
  awayTeamId?: string;
  startsAt: string;
  venue?: string;
  status: "scheduled" | "live" | "final" | "postponed";
}

export interface Pick {
  id: string;
  matchId: string;
  match: Match;
  sport: Sport;
  betType: BetType;
  side: MarketSide | string;
  line?: number;
  selectionLabel: string;
  odds: OddsQuote;
  closingOdds?: OddsQuote;
  edge: EdgeEstimate;
  tier: RiskTier;
  signals: Signal[];
  rationaleTemplate: RationaleTemplate;
  suggestedUnitStake: number;
  suggestedFractionalKelly: number;
  status: PickStatus;
  settledAt?: string;
  gradedResult?: "win" | "loss" | "push" | "void";
  clv?: number;
  modelVersion: string;
  createdAt: string;
  playerId?: string;
  playerName?: string;
  playerTeam?: string;
}

export interface RationaleTemplate {
  thesis: string;
  supportingSignalIds: string[];
  risk: string;
}

export interface ParlayLeg {
  pickId: string;
  correlationGroup?: string;
}

export interface Parlay {
  id: string;
  legs: ParlayLeg[];
  simulatedTrueProb: number;
  combinedDecimalOdds: number;
  combinedAmericanOdds: number;
  impliedProb: number;
  edge: number;
  simulations: number;
  suggestedUnitStake: number;
  createdAt: string;
}

export interface Settlement {
  pickId: string;
  result: "win" | "loss" | "push" | "void";
  finalScore?: { home: number; away: number };
  closingAmericanOdds?: number;
  clv?: number;
  settledAt: string;
}
