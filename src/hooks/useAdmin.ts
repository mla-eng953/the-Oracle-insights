import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QueryTiming } from "@/lib/queryKeys";
import { useAppData } from "./useAppData";

export interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  payload: unknown;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "pro" | "free";
  plan: "free" | "pro" | "elite";
  created_at: string;
}

export interface DriftRow {
  sport: string;
  n_recent: number;
  n_prior: number;
  mean_recent_bp: number;
  mean_prior_bp: number;
  mean_shift_bp: number;
  p: number;
}

export function useAuditLog(limit = 100) {
  const { data: app } = useAppData();
  return useQuery({
    queryKey: ["admin", "audit", limit],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!app?.isAdmin,
    ...QueryTiming.USER_DATA,
  });
}

export function useDriftSnapshot() {
  const { data: app } = useAppData();
  return useQuery({
    queryKey: ["admin", "drift"],
    queryFn: async (): Promise<DriftRow[]> => {
      const { data, error } = await supabase.functions.invoke<{ findings: DriftRow[] }>("check-model-drift");
      if (error) throw error;
      return data?.findings ?? [];
    },
    enabled: !!app?.isAdmin,
    staleTime: 60 * 60_000,
  });
}

export function useAdminUsers(query = "") {
  const { data: app } = useAppData();
  return useQuery({
    queryKey: ["admin", "users", query],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.functions.invoke<{ users: AdminUser[] }>("admin-users", { body: { query } });
      if (error) throw error;
      return data?.users ?? [];
    },
    enabled: !!app?.isAdmin,
    ...QueryTiming.USER_DATA,
  });
}
