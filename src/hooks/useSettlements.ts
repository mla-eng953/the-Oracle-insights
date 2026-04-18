import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { MOCK_PICKS, MOCK_SETTLEMENTS } from "@/lib/mockData";
import type { Pick, Settlement } from "@/types/oracle";
import { useAuth } from "./useAuth";

export interface SettledPick { pick: Pick; settlement: Settlement }

export function useSettlements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.settlements(user?.id),
    queryFn: async (): Promise<SettledPick[]> => {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return MOCK_SETTLEMENTS.slice(0, 4).map((s, i) => ({
          pick: { ...MOCK_PICKS[i % MOCK_PICKS.length], id: `settled_${i}`, status: s.result === "push" ? "push" : s.result === "win" ? "won" : "lost" },
          settlement: s,
        }));
      }
      const { data, error } = await supabase
        .from("pick_settlements")
        .select("*, pick:picks(*)")
        .order("settled_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r: { pick: Pick } & Settlement) => ({ pick: r.pick, settlement: r as unknown as Settlement }));
    },
    ...QueryTiming.USER_DATA,
  });
}

export function useRealtimeSettlements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("settlements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pick_settlements" }, () => {
        qc.invalidateQueries({ queryKey: QK.settlements(user.id) });
        qc.invalidateQueries({ queryKey: QK.tracked(user.id) });
        qc.invalidateQueries({ queryKey: QK.results(user.id) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, user]);
}
