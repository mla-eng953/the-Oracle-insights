import { useQuery } from "@tanstack/react-query";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { summarize, type CLVPoint } from "@/lib/clv";
import { supabase } from "@/lib/supabase";
import { MOCK_SETTLEMENTS } from "@/lib/mockData";
import { useAuth } from "./useAuth";

export function useCLV(range: "7d" | "30d" | "90d" | "all" = "30d") {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.clv(user?.id, range),
    queryFn: async () => {
      const points = await fetchPoints(range);
      return { points, summary: summarize(points) };
    },
    ...QueryTiming.USER_DATA,
  });
}

async function fetchPoints(range: string): Promise<CLVPoint[]> {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return MOCK_SETTLEMENTS.map(s => ({
      pickId: s.pickId,
      settledAt: s.settledAt,
      clv: s.clv ?? 0,
      entryAmerican: -110,
      closingAmerican: s.closingAmericanOdds ?? -110,
      result: s.result,
    }));
  }
  const cutoff = cutoffFor(range);
  const q = supabase.from("closing_odds_join").select("*").order("settled_at", { ascending: false }).limit(500);
  if (cutoff) q.gte("settled_at", cutoff);
  const { data, error } = await q;
  if (error) return [];
  return (data as unknown as CLVPoint[]) ?? [];
}

function cutoffFor(range: string): string | null {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 0;
  return days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : null;
}
