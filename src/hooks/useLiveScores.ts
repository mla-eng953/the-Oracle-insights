import { useQuery } from "@tanstack/react-query";
import { invokeFn } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import type { Sport } from "@/types/oracle";

export interface LiveScore {
  matchId: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period?: string;
  clock?: string;
  status: "scheduled" | "live" | "final";
}

export function useLiveScores(sport: Sport) {
  return useQuery({
    queryKey: QK.liveScores(sport),
    queryFn: async (): Promise<LiveScore[]> => {
      const { data, error } = await invokeFn<LiveScore[]>("live-scores", { sport });
      if (error) return [];
      return data ?? [];
    },
    ...QueryTiming.LIVE,
  });
}
