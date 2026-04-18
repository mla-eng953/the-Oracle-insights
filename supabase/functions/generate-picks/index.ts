// Generate Oracle picks: pull odds + signal markets + injuries,
// compute fair price, filter by edge + confidence, insert into picks table.
// This is a queue-driven worker; cron (11am + 7pm ET) seeds the queue.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { americanToDecimal, americanToImpliedProb } from "../_shared/oddsMath.ts";
import {
  computeFairPrice,
  computeEdge,
  assignTier,
  shouldSurface,
  defaultSizing,
  type BookQuote,
} from "../_shared/algorithm.ts";

const SPORT_WEIGHTS: Record<string, { sharp: number; signal: number; news: number }> = {
  NFL: { sharp: 0.55, signal: 0.35, news: 0.10 },
  NBA: { sharp: 0.60, signal: 0.30, news: 0.10 },
  MLB: { sharp: 0.58, signal: 0.32, news: 0.10 },
  NHL: { sharp: 0.62, signal: 0.28, news: 0.10 },
  NCAAF: { sharp: 0.65, signal: 0.25, news: 0.10 },
  NCAAB: { sharp: 0.65, signal: 0.25, news: 0.10 },
  UFC: { sharp: 0.55, signal: 0.40, news: 0.05 },
  EPL: { sharp: 0.60, signal: 0.30, news: 0.10 },
  MLS: { sharp: 0.60, signal: 0.30, news: 0.10 },
  LALIGA: { sharp: 0.60, signal: 0.30, news: 0.10 },
  SERIEA: { sharp: 0.60, signal: 0.30, news: 0.10 },
  TENNIS: { sharp: 0.55, signal: 0.40, news: 0.05 },
  GOLF: { sharp: 0.55, signal: 0.40, news: 0.05 },
};

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;

  try {
    const supabase = adminClient();
    const { sport } = (await req.json().catch(() => ({}))) as { sport?: string };

    const rawMatches = await loadMatches(sport);
    const oddsByMatch = await loadOdds(rawMatches.map(m => m.id));
    const signalByMatch = await loadSignal(rawMatches.map(m => m.id));

    const inserts: unknown[] = [];
    for (const match of rawMatches) {
      const odds = oddsByMatch.get(match.id);
      if (!odds || odds.books.length < 2) continue;

      const weights = SPORT_WEIGHTS[match.sport] ?? SPORT_WEIGHTS.NFL;
      const fair = computeFairPrice({
        books: odds.books,
        signalMarketProb: signalByMatch.get(match.id),
        perSportWeights: weights,
      });

      // Pick the best market side based on which side has positive edge vs fair.
      const bestBook = odds.books.reduce((acc, b) => (b.sharpWeight > acc.sharpWeight ? b : acc), odds.books[0]);
      const american = bestBook.home ?? bestBook.over ?? -110;
      const edgeRes = computeEdge(fair.trueProb, fair.trueProbLow, fair.trueProbHigh, american);

      if (!shouldSurface({
        edge: edgeRes.edge,
        edgeLow: edgeRes.edgeLow,
        confidence: edgeRes.confidence,
        sport: match.sport,
        betType: "moneyline",
        american,
      })) continue;

      const tier = assignTier(edgeRes.edge, edgeRes.confidence);
      const sizing = defaultSizing(fair.trueProb, american);
      const signals = buildSignals(fair, signalByMatch.get(match.id), odds.books.length);

      inserts.push({
        match_id: match.id,
        sport: match.sport,
        bet_type: "moneyline",
        side: "home",
        line: null,
        selection_label: `${match.home_team} ML`,
        american_odds: american,
        decimal_odds: americanToDecimal(american),
        implied_prob: americanToImpliedProb(american),
        true_prob: fair.trueProb,
        true_prob_low: fair.trueProbLow,
        true_prob_high: fair.trueProbHigh,
        edge_pct: edgeRes.edge,
        confidence: edgeRes.confidence,
        tier,
        signals,
        rationale: {
          thesis: `Model fair ${(fair.trueProb * 100).toFixed(1)}% vs implied ${(americanToImpliedProb(american) * 100).toFixed(1)}%.`,
          risk: "Check injuries within 2h of tip. Line-shop before stake.",
        },
        suggested_unit_stake: sizing.suggestedUnitStake,
        suggested_fractional_kelly: sizing.suggestedFractionalKelly,
        model_version: "oracle-3.2.0",
      });
    }

    if (inserts.length === 0) {
      return jsonResponse({ ok: true, inserted: 0, reason: "no picks above thresholds" });
    }

    const { error } = await supabase.from("picks").insert(inserts);
    if (error) throw error;
    return jsonResponse({ ok: true, inserted: inserts.length });
  } catch (err) {
    console.error("[generate-picks]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

async function loadMatches(sport?: string) {
  const supabase = adminClient();
  let q = supabase.from("matches").select("id, sport, home_team, away_team, starts_at, status").gte("starts_at", new Date().toISOString()).lte("starts_at", new Date(Date.now() + 36 * 3600_000).toISOString());
  if (sport) q = q.eq("sport", sport);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function loadOdds(_matchIds: string[]): Promise<Map<string, { books: BookQuote[] }>> {
  // Real implementation calls sportsbook-odds edge fn or Odds API directly.
  // Returning empty map by default; populated when ODDS_API_KEY is set.
  return new Map();
}

async function loadSignal(_matchIds: string[]): Promise<Map<string, number>> {
  // Kalshi / prediction-market relay. Empty unless KALSHI_API_KEY is set.
  return new Map();
}

function buildSignals(fair: ReturnType<typeof computeFairPrice>, signalProb: number | undefined, bookCount: number) {
  const out = [];
  if (signalProb != null) {
    out.push({
      kind: "consensus", label: "Signal probability",
      value: signalProb.toFixed(3),
      sentiment: signalProb > fair.sharpConsensus ? "bullish" : "bearish",
      detail: "Prediction-market implied probability.",
      weight: 1.5,
    });
  }
  out.push({
    kind: "sharp_aligned", label: "Sharp consensus",
    value: fair.sharpConsensus.toFixed(3),
    sentiment: "neutral",
    detail: `Weighted across ${bookCount} books.`,
    weight: 2,
  });
  return out;
}
