import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useCompliance } from "@/hooks/useCompliance";
import type { ComplianceCheck } from "@/types/compliance";

interface Ctx {
  check: ComplianceCheck | undefined;
  loading: boolean;
  gated: boolean;
}

const ComplianceContext = createContext<Ctx>({ check: undefined, loading: true, gated: true });

export function ComplianceProvider({ children }: PropsWithChildren) {
  const { data, isLoading } = useCompliance();
  const value = useMemo<Ctx>(() => ({
    check: data,
    loading: isLoading,
    gated: !data || data.status !== "allowed" || !data.ageVerified,
  }), [data, isLoading]);
  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
}

export function useComplianceCtx() { return useContext(ComplianceContext); }
