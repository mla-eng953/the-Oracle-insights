import type { Sport } from "@/types/oracle";

export const QK = {
  auth: ["auth"] as const,
  appData: (userId: string | undefined) => ["appData", userId] as const,
  picks: (filters?: { sport?: Sport; tier?: string; category?: string }) =>
    ["picks", filters ?? {}] as const,
  pick: (id: string) => ["pick", id] as const,
  tracked: (userId: string | undefined) => ["tracked", userId] as const,
  settlements: (userId: string | undefined) => ["settlements", userId] as const,
  results: (userId: string | undefined) => ["results", userId] as const,
  liveScores: (sport: Sport) => ["liveScores", sport] as const,
  news: (sport?: Sport) => ["news", sport ?? "all"] as const,
  marketIntel: (tab: string, sport?: Sport) => ["marketIntel", tab, sport ?? "all"] as const,
  analytics: (userId: string | undefined, range: string) =>
    ["analytics", userId, range] as const,
  clv: (userId: string | undefined, range: string) => ["clv", userId, range] as const,
  strategy: (userId: string | undefined) => ["strategy", userId] as const,
  compliance: (userId: string | undefined) => ["compliance", userId] as const,
};

export const QueryTiming = {
  USER_DATA: { staleTime: 30_000, gcTime: 5 * 60_000 },
  PICKS: { staleTime: 60_000, gcTime: 10 * 60_000 },
  LIVE: { staleTime: 10_000, gcTime: 60_000, refetchInterval: 15_000 },
  STATIC: { staleTime: 10 * 60_000, gcTime: 30 * 60_000 },
} as const;
