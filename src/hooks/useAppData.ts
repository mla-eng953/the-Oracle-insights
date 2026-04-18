import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QK, QueryTiming } from "@/lib/queryKeys";
import { useAuth } from "./useAuth";

export interface AppData {
  isAdmin: boolean;
  role: "admin" | "pro" | "free" | null;
  subscription: { plan: "free" | "pro"; renewsAt?: string } | null;
  credits: number;
  unlocks: string[];
}

const EMPTY: AppData = { isAdmin: false, role: null, subscription: null, credits: 0, unlocks: [] };

export function useAppData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.appData(user?.id),
    queryFn: async (): Promise<AppData> => {
      if (!user) return EMPTY;
      const [roles, sub, credits, unlocks] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_subscriptions").select("plan, renews_at").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_user_credits", { uid: user.id }),
        supabase.from("content_unlocks").select("feature_key, expires_at").eq("user_id", user.id),
      ]);
      const roleList: string[] = roles.data?.map((r: { role: string }) => r.role) ?? [];
      const role = (roleList.includes("admin") ? "admin" : roleList.includes("pro") ? "pro" : "free") as AppData["role"];
      const nowIso = new Date().toISOString();
      const activeUnlocks: string[] = (unlocks.data ?? [])
        .filter((u: { expires_at?: string }) => !u.expires_at || u.expires_at > nowIso)
        .map((u: { feature_key: string }) => u.feature_key);
      return {
        isAdmin: role === "admin",
        role,
        subscription: sub.data ? { plan: sub.data.plan, renewsAt: sub.data.renews_at } : { plan: "free" },
        credits: typeof credits.data === "number" ? credits.data : 0,
        unlocks: activeUnlocks,
      };
    },
    enabled: !!user,
    ...QueryTiming.USER_DATA,
  });
}

export function useIsAdmin() { return useAppData().data?.isAdmin ?? false; }
export function useUserCredits() { return useAppData().data?.credits ?? 0; }
export function useActiveUnlocks() { return useAppData().data?.unlocks ?? []; }
export function useUserPlan() { return useAppData().data?.subscription?.plan ?? "free"; }
