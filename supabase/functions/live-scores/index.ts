// ESPN scoreboard relay. Thin wrapper with short cache so the client never
// hits ESPN directly — keeps your usage inside ToS and cacheable at edge.

import { preflight, jsonResponse } from "../_shared/cors.ts";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports";
const SPORT_PATHS: Record<string, string> = {
  NFL: "football/nfl",
  NBA: "basketball/nba",
  MLB: "baseball/mlb",
  NHL: "hockey/nhl",
  NCAAF: "football/college-football",
  NCAAB: "basketball/mens-college-basketball",
  MLS: "soccer/usa.1",
  EPL: "soccer/eng.1",
  LALIGA: "soccer/esp.1",
  SERIEA: "soccer/ita.1",
};

const CACHE = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 10_000;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { sport } = await req.json() as { sport: string };
    const path = SPORT_PATHS[sport];
    if (!path) return jsonResponse({ ok: true, data: [] });

    const cached = CACHE.get(sport);
    if (cached && Date.now() - cached.at < TTL_MS) {
      return jsonResponse({ ok: true, data: cached.data, cached: true });
    }

    const res = await fetch(`${ESPN}/${path}/scoreboard`, {
      headers: { "user-agent": "OracleInsights/1.0 (contact@example.com)" },
    });
    if (!res.ok) return jsonResponse({ ok: false, data: [] });
    const json = await res.json();
    const data = (json.events ?? []).map((e: { id: string; status: { type: { state: string } }; competitions?: Array<{ competitors?: Array<{ homeAway: string; team: { displayName: string }; score: string }> }> }) => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === "home");
      const away = comp?.competitors?.find(c => c.homeAway === "away");
      return {
        matchId: e.id,
        sport,
        homeTeam: home?.team.displayName ?? "",
        awayTeam: away?.team.displayName ?? "",
        homeScore: Number(home?.score ?? 0),
        awayScore: Number(away?.score ?? 0),
        status: e.status.type.state === "in" ? "live" : e.status.type.state === "post" ? "final" : "scheduled",
      };
    });
    CACHE.set(sport, { at: Date.now(), data });
    return jsonResponse({ ok: true, data });
  } catch (err) {
    console.error("[live-scores]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
