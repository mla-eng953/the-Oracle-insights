import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invokeFn, supabase } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { useAuth } from "./useAuth";
import type { Pick } from "@/types/oracle";

export function useTrackedPicks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.tracked(user?.id),
    queryFn: async (): Promise<Pick[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tracked_picks")
        .select("pick:picks(*)")
        .eq("user_id", user.id)
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []).map((r: { pick: Pick }) => r.pick).filter(Boolean);
    },
    enabled: !!user,
    ...QueryTiming.USER_DATA,
  });
}

export function useTrackPick() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (pickId: string) => {
      const { data, error } = await invokeFn<{ ok: boolean }>("track-pick", { pickId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tracked(user?.id) }),
  });
}
