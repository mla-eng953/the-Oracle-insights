import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeFn } from "@/lib/supabase";
import { QK } from "@/lib/queryKeys";
import type { ComplianceCheck } from "@/types/compliance";
import { useAuth } from "./useAuth";

const LOCAL_KEY = "oracle.compliance";

export function useCompliance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK.compliance(user?.id),
    queryFn: async (): Promise<ComplianceCheck> => {
      const cached = typeof localStorage !== "undefined" ? localStorage.getItem(LOCAL_KEY) : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ComplianceCheck;
          if (Date.now() - new Date(parsed.checkedAt).getTime() < 24 * 3600_000) return parsed;
        } catch { /* ignore */ }
      }
      const { data, error } = await invokeFn<ComplianceCheck>("compliance-check");
      if (error || !data) {
        return { status: "unknown", jurisdiction: "unknown", country: "", ageVerified: false, checkedAt: new Date().toISOString() };
      }
      if (typeof localStorage !== "undefined") localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
      return data;
    },
    staleTime: 12 * 3600_000,
    gcTime: 24 * 3600_000,
  });
}

export function markAgeVerified(dobIso: string) {
  if (typeof localStorage === "undefined") return;
  const existing = localStorage.getItem(LOCAL_KEY);
  const parsed = existing ? (JSON.parse(existing) as ComplianceCheck) : undefined;
  const next: ComplianceCheck = {
    status: parsed?.status ?? "unknown",
    jurisdiction: parsed?.jurisdiction ?? "unknown",
    country: parsed?.country ?? "",
    ageVerified: true,
    ageVerifiedAt: new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    restrictionReason: parsed?.restrictionReason,
    region: parsed?.region,
  };
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  localStorage.setItem("oracle.dob", dobIso);
}

export function useRespectfulSessionNudge() {
  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      const minutes = Math.floor((Date.now() - start) / 60_000);
      if (minutes > 0 && minutes % 45 === 0) {
        const evt = new CustomEvent("oracle:rg-nudge", { detail: { minutes } });
        window.dispatchEvent(evt);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);
}
