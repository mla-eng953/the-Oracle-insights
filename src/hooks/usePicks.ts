import { useQuery } from "@tanstack/react-query";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { MOCK_PICKS } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import type { Pick, RiskTier, Sport } from "@/types/oracle";

interface Filters {
  sport?: Sport;
  tier?: RiskTier;
  category?: "games" | "player_props" | "potd";
}

function classifySegment(p: Pick): "live" | "today" | "upcoming" | "future" {
  if (p.status === "live" || p.match.status === "live") return "live";
  const delta = new Date(p.match.startsAt).getTime() - Date.now();
  if (delta < 12 * 3600_000) return "today";
  if (delta < 36 * 3600_000) return "upcoming";
  return "future";
}

export function usePicks(filters: Filters = {}) {
  return useQuery({
    queryKey: QK.picks(filters),
    queryFn: async (): Promise<Pick[]> => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) return applyFilters(MOCK_PICKS, filters);
      const { data, error } = await supabase
        .from("picks")
        .select("*, match:matches(*)")
        .eq("status_active", true)
        .limit(200);
      if (error || !data?.length) return applyFilters(MOCK_PICKS, filters);
      return applyFilters(data as unknown as Pick[], filters);
    },
    ...QueryTiming.PICKS,
  });
}

export function useSegmentedPicks(filters: Filters = {}) {
  const q = usePicks(filters);
  const picks = q.data ?? [];
  const segments = {
    live: [] as Pick[],
    today: [] as Pick[],
    upcoming: [] as Pick[],
    future: [] as Pick[],
  };
  for (const p of picks) segments[classifySegment(p)].push(p);
  Object.values(segments).forEach(arr =>
    arr.sort((a, b) => new Date(a.match.startsAt).getTime() - new Date(b.match.startsAt).getTime()),
  );
  return { ...q, segments };
}

function applyFilters(picks: Pick[], f: Filters): Pick[] {
  return picks.filter(p => {
    if (f.sport && p.sport !== f.sport) return false;
    if (f.tier && p.tier !== f.tier) return false;
    if (f.category === "player_props" && p.betType !== "player_prop") return false;
    if (f.category === "games" && p.betType === "player_prop") return false;
    return true;
  });
}
