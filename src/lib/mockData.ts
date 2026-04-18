import type { Match, Pick, Settlement, Signal } from "@/types/oracle";
import { buildQuote, americanToImpliedProb, edge as edgeFn } from "./oddsMath";

const now = Date.now();

function future(hours: number): string {
  return new Date(now + hours * 3600_000).toISOString();
}
function past(hours: number): string {
  return new Date(now - hours * 3600_000).toISOString();
}

const matches: Match[] = [
  { id: "m_nba_1", sport: "NBA", homeTeam: "Boston Celtics", awayTeam: "Milwaukee Bucks", startsAt: future(3), status: "scheduled" },
  { id: "m_nba_2", sport: "NBA", homeTeam: "Denver Nuggets", awayTeam: "Phoenix Suns", startsAt: future(6), status: "scheduled" },
  { id: "m_nfl_1", sport: "NFL", homeTeam: "Kansas City Chiefs", awayTeam: "Buffalo Bills", startsAt: future(28), status: "scheduled" },
  { id: "m_mlb_1", sport: "MLB", homeTeam: "Los Angeles Dodgers", awayTeam: "San Diego Padres", startsAt: future(4), status: "scheduled" },
  { id: "m_nhl_1", sport: "NHL", homeTeam: "Edmonton Oilers", awayTeam: "Vegas Golden Knights", startsAt: future(1), status: "live" },
  { id: "m_mls_1", sport: "MLS", homeTeam: "LAFC", awayTeam: "Inter Miami", startsAt: future(22), status: "scheduled" },
  { id: "m_ufc_1", sport: "UFC", homeTeam: "Islam Makhachev", awayTeam: "Arman Tsarukyan", startsAt: future(40), status: "scheduled" },
];

function sig(label: string, sentiment: Signal["sentiment"], kind: Signal["kind"], detail?: string, value?: string | number, weight = 1): Signal {
  return { label, sentiment, kind, detail, value, weight };
}

function mkPick(args: {
  id: string; matchIdx: number; betType: Pick["betType"]; side: string; selection: string;
  line?: number; american: number; trueProb: number; tier: Pick["tier"]; signals: Signal[];
  player?: { name: string; team: string; id: string };
}): Pick {
  const match = matches[args.matchIdx];
  const odds = buildQuote(args.american);
  const implied = americanToImpliedProb(args.american);
  const e = edgeFn(args.trueProb, implied);
  const ci = 0.018;
  return {
    id: args.id,
    matchId: match.id,
    match,
    sport: match.sport,
    betType: args.betType,
    side: args.side,
    line: args.line,
    selectionLabel: args.selection,
    odds,
    edge: {
      trueProb: args.trueProb,
      trueProbLow: Math.max(0, args.trueProb - ci),
      trueProbHigh: Math.min(1, args.trueProb + ci),
      edge: e,
      edgeLow: e - ci,
      edgeHigh: e + ci,
      confidence: Math.round(Math.min(95, 55 + e * 400)),
    },
    tier: args.tier,
    signals: args.signals,
    rationaleTemplate: {
      thesis: `Model fair price ${Math.round(args.trueProb * 100)}% vs market ${Math.round(implied * 100)}%.`,
      supportingSignalIds: args.signals.map(s => s.label),
      risk: `Projected variance lane; keep stake within ${Math.round(e > 0.05 ? 2 : 1)}% of bankroll.`,
    },
    suggestedUnitStake: Math.max(0.5, Math.round(e * 40 * 10) / 10),
    suggestedFractionalKelly: Math.max(0, e * 0.25),
    status: match.status === "live" ? "live" : "pending",
    modelVersion: "oracle-3.2.0",
    createdAt: past(2),
    playerId: args.player?.id,
    playerName: args.player?.name,
    playerTeam: args.player?.team,
  };
}

export const MOCK_PICKS: Pick[] = [
  mkPick({
    id: "p1", matchIdx: 0, betType: "spread", side: "home", selection: "Celtics -4.5", line: -4.5,
    american: -108, trueProb: 0.56, tier: "moderate",
    signals: [
      sig("Sharp consensus", "bullish", "sharp_aligned", "Pinnacle & Circa aligned on home -4.5", "+4.5%", 2),
      sig("Signal probability", "bullish", "consensus", "Prediction market 57% home", 0.57, 1.5),
      sig("Line movement", "bullish", "line_movement", "Moved from -3 despite 41% public on home", "RLM", 1.5),
    ],
  }),
  mkPick({
    id: "p2", matchIdx: 1, betType: "total", side: "under", selection: "Total Under 228.5", line: 228.5,
    american: -110, trueProb: 0.545, tier: "conservative",
    signals: [
      sig("Pace slowdown", "bullish", "edge", "Both teams bottom-8 in pace last 10", "-3.1 poss", 1.5),
      sig("Public overweight over", "bullish", "public_fade", "68% public on over", "Fade", 1),
    ],
  }),
  mkPick({
    id: "p3", matchIdx: 2, betType: "moneyline", side: "away", selection: "Bills ML",
    american: +118, trueProb: 0.49, tier: "aggressive",
    signals: [
      sig("Dog value", "bullish", "edge", "Model fair +104 vs market +118", "+6.3%", 2),
      sig("Key injury", "bullish", "injury", "KC starting LT ruled out", "OUT", 1.5),
    ],
  }),
  mkPick({
    id: "p4", matchIdx: 3, betType: "nrfi", side: "yes", selection: "NRFI — Dodgers vs Padres",
    american: -125, trueProb: 0.60, tier: "moderate",
    signals: [
      sig("Elite starters", "bullish", "edge", "Both starters sub-3.00 ERA L30", "xERA 2.84/2.91", 2),
      sig("Park factor", "bullish", "edge", "Dodger Stadium pitcher-friendly", "0.92 run idx", 1),
    ],
  }),
  mkPick({
    id: "p5", matchIdx: 0, betType: "player_prop", side: "over", selection: "Jayson Tatum Over 27.5 PTS", line: 27.5,
    american: -115, trueProb: 0.57, tier: "moderate",
    player: { name: "Jayson Tatum", team: "BOS", id: "espn_1234" },
    signals: [
      sig("Usage spike", "bullish", "edge", "32% USG with Porziņģis out", "USG 32%", 2),
      sig("Matchup pace", "bullish", "edge", "Opponent 4th in pace allowed", "107.3", 1),
    ],
  }),
  mkPick({
    id: "p6", matchIdx: 4, betType: "moneyline", side: "home", selection: "Oilers ML",
    american: -135, trueProb: 0.61, tier: "conservative",
    signals: [
      sig("Home ice advantage", "bullish", "edge", "Oilers 18-6 at home L24", "75% W", 1),
      sig("Goaltending edge", "bullish", "edge", "Skinner .925 SV% L10", ".925", 1.5),
    ],
  }),
];

export const MOCK_SETTLEMENTS: Settlement[] = [
  { pickId: "s1", result: "win", finalScore: { home: 114, away: 108 }, closingAmericanOdds: -105, clv: 0.014, settledAt: past(18) },
  { pickId: "s2", result: "win", finalScore: { home: 211, away: 204 }, closingAmericanOdds: -118, clv: 0.031, settledAt: past(20) },
  { pickId: "s3", result: "loss", finalScore: { home: 27, away: 17 }, closingAmericanOdds: +124, clv: 0.017, settledAt: past(44) },
  { pickId: "s4", result: "push", closingAmericanOdds: -120, clv: 0.008, settledAt: past(68) },
  { pickId: "s5", result: "win", closingAmericanOdds: -110, clv: 0.022, settledAt: past(92) },
  { pickId: "s6", result: "loss", closingAmericanOdds: -130, clv: -0.009, settledAt: past(116) },
];

export const MOCK_NEWS = [
  { id: "n1", headline: "Porziņģis ruled out, Tatum usage projected 32%", sport: "NBA", sentimentScore: 0.7, publishedAt: past(2) },
  { id: "n2", headline: "Chiefs LT Taylor downgraded to Out for Sunday", sport: "NFL", sentimentScore: -0.4, publishedAt: past(6) },
  { id: "n3", headline: "Dodgers roll out ace in series opener vs Padres", sport: "MLB", sentimentScore: 0.3, publishedAt: past(4) },
];
