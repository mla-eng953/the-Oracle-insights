import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { DEFAULT_STRATEGY, type StrategyProfile } from "@/types/strategy";
import { useAuth } from "./useAuth";

function localKey(userId: string) { return `oracle.strategy.${userId}`; }

export function useStrategyProfile() {
  const { user } = useAuth();
  const uid = user?.id;
  return useQuery({
    queryKey: QK.strategy(uid),
    queryFn: async (): Promise<StrategyProfile> => {
      const base: StrategyProfile = {
        id: "local",
        userId: uid ?? "anon",
        ...DEFAULT_STRATEGY,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!uid) {
        const cached = typeof localStorage !== "undefined" ? localStorage.getItem(localKey("anon")) : null;
        return cached ? { ...base, ...(JSON.parse(cached) as Partial<StrategyProfile>) } : base;
      }
      const { data } = await supabase.from("strategy_profiles").select("*").eq("user_id", uid).maybeSingle();
      return data ? (data as unknown as StrategyProfile) : base;
    },
    ...QueryTiming.USER_DATA,
  });
}

export function useUpdateStrategyProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id;
  return useMutation({
    mutationFn: async (patch: Partial<StrategyProfile>) => {
      if (!uid) {
        const existing = typeof localStorage !== "undefined" ? localStorage.getItem(localKey("anon")) : null;
        const merged = { ...(existing ? JSON.parse(existing) : {}), ...patch };
        if (typeof localStorage !== "undefined") localStorage.setItem(localKey("anon"), JSON.stringify(merged));
        return merged;
      }
      const { data, error } = await supabase
        .from("strategy_profiles")
        .upsert({ user_id: uid, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.strategy(uid) }),
  });
}
