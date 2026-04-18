import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QueryTiming } from "@/lib/queryKeys";
import { useAuth } from "./useAuth";

type Status = "self-attested" | "pending" | "approved" | "declined" | "expired" | null;

export function useAgeVerificationStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ageVerificationStatus", user?.id],
    queryFn: async (): Promise<Status> => {
      if (!user) return null;
      const { data } = await supabase
        .from("age_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.status as Status) ?? null;
    },
    enabled: !!user,
    ...QueryTiming.USER_DATA,
  });
}
