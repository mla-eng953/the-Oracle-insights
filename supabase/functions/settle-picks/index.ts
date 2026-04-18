// Settle picks by fetching official box scores from ESPN.
// Computes CLV using the closing line captured by capture-closing-odds.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { americanToImpliedProb } from "../_shared/oddsMath.ts";
import { createLogger } from "../_shared/logger.ts";

interface PickRow {
  id: string;
  match_id: string;
  sport: string;
  bet_type: string;
  side: string;
  line: number | null;
  american_odds: number;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const log = createLogger("settle-picks");
  try {
    const supabase = adminClient();

    const { data: picks, error } = await supabase
      .from("picks")
      .select("id, match_id, sport, bet_type, side, line, american_odds, match:matches!inner(final_home_score, final_away_score, status)")
      .eq("status_active", true)
      .is("settled", false);
    if (error) throw error;

    let settled = 0;
    for (const p of (picks ?? []) as Array<PickRow & { match: { final_home_score: number | null; final_away_score: number | null; status: string } }>) {
      const m = p.match;
      if (m.status !== "final" || m.final_home_score == null || m.final_away_score == null) continue;

      const result = grade(p, m.final_home_score, m.final_away_score);
      const { data: close } = await supabase
        .from("closing_odds").select("implied_prob").eq("pick_id", p.id).maybeSingle();
      const clv = close?.implied_prob != null ? close.implied_prob - americanToImpliedProb(p.american_odds) : null;

      await supabase.from("pick_settlements").upsert({
        pick_id: p.id,
        result,
        final_home_score: m.final_home_score,
        final_away_score: m.final_away_score,
        clv,
        settled_at: new Date().toISOString(),
      }, { onConflict: "pick_id" });
      settled++;
    }

    log.info("done", { settled });
    await log.flush();
    return jsonResponse({ ok: true, settled });
  } catch (err) {
    log.error("failed", { error: (err as Error).message });
    await log.flush();
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

function grade(p: { bet_type: string; side: string; line: number | null }, homeScore: number, awayScore: number): "win" | "loss" | "push" | "void" {
  if (p.bet_type === "moneyline") {
    if (homeScore === awayScore) return "push";
    const homeWin = homeScore > awayScore;
    return (p.side === "home" ? homeWin : !homeWin) ? "win" : "loss";
  }
  if (p.bet_type === "spread" && p.line != null) {
    const homeAdj = homeScore + p.line;
    if (homeAdj === awayScore) return "push";
    const homeCover = homeAdj > awayScore;
    return (p.side === "home" ? homeCover : !homeCover) ? "win" : "loss";
  }
  if (p.bet_type === "total" && p.line != null) {
    const total = homeScore + awayScore;
    if (total === p.line) return "push";
    const over = total > p.line;
    return (p.side === "over" ? over : !over) ? "win" : "loss";
  }
  return "void";
}
