import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { useAuth } from "./useAuth";
import type { Entitlement, FeatureKey } from "@/types/entitlement";

const FREE: Entitlement = {
  tier: "free",
  features: ["view_picks", "track_pick_limited", "basic_analytics"],
  source: "default",
};

export function useEntitlements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...QK.appData(user?.id), "entitlements"],
    queryFn: async (): Promise<Entitlement> => {
      if (!user) return FREE;
      const { data } = await supabase
        .from("entitlements")
        .select("tier, features, expires_at, source")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return FREE;
      return {
        tier: data.tier,
        features: data.features as FeatureKey[],
        expiresAt: data.expires_at ?? undefined,
        source: data.source,
      };
    },
    initialData: FREE,
    ...QueryTiming.USER_DATA,
  });
}

export function useHasFeature(feature: FeatureKey): boolean {
  const { data } = useEntitlements();
  const ent = data ?? FREE;
  if (ent.expiresAt && new Date(ent.expiresAt) < new Date()) return false;
  return ent.features.includes(feature);
}
