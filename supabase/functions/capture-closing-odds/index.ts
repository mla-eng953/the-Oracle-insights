// Capture the closing line immediately before kickoff/tipoff.
// Core input for CLV; run on a 1-minute cron in the last 20 minutes pre-game.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { americanToImpliedProb, americanToDecimal } from "../_shared/oddsMath.ts";
import { createLogger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const log = createLogger("capture-closing-odds");
  try {
    const supabase = adminClient();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 20 * 60_000).toISOString();

    const { data, error } = await supabase
      .from("picks")
      .select("id, match_id, american_odds, match:matches!inner(starts_at)")
      .lte("match.starts_at", windowEnd)
      .gte("match.starts_at", now.toISOString());
    if (error) throw error;

    let captured = 0;
    for (const p of (data ?? []) as Array<{ id: string; match_id: string; american_odds: number }>) {
      // In production: fetch current best line from sportsbook-odds function.
      // Here we just snapshot the pick's entry line as a placeholder.
      const american = p.american_odds;
      await supabase.from("closing_odds").upsert({
        pick_id: p.id,
        american_odds: american,
        decimal_odds: americanToDecimal(american),
        implied_prob: americanToImpliedProb(american),
        captured_at: new Date().toISOString(),
      }, { onConflict: "pick_id" });
      captured++;
    }

    log.info("done", { captured });
    await log.flush();
    return jsonResponse({ ok: true, captured });
  } catch (err) {
    log.error("failed", { error: (err as Error).message });
    await log.flush();
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
