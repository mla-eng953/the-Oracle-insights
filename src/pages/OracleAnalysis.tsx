import { useMemo, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { PickCard } from "@/components/PickCard";
import { FilterChips } from "@/components/FilterChips";
import { useSegmentedPicks } from "@/hooks/usePicks";
import { useStrategyProfile } from "@/hooks/useStrategyProfile";
import type { RiskTier, Sport } from "@/types/oracle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Category = "all" | "games" | "player_props" | "potd";

const SPORTS: Array<{ value: Sport; label: string }> = [
  { value: "NBA", label: "NBA" }, { value: "NFL", label: "NFL" }, { value: "MLB", label: "MLB" },
  { value: "NHL", label: "NHL" }, { value: "UFC", label: "UFC" }, { value: "MLS", label: "MLS" },
];

const TIERS: Array<{ value: RiskTier; label: string }> = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

export default function OracleAnalysis() {
  const [sport, setSport] = useState<Sport | null>(null);
  const [tier, setTier] = useState<RiskTier | null>(null);
  const [category, setCategory] = useState<Category>("all");

  const filters = useMemo(() => ({
    sport: sport ?? undefined,
    tier: tier ?? undefined,
    category: category === "all" ? undefined : category === "potd" ? undefined : category,
  }), [sport, tier, category]);

  const { segments, isLoading } = useSegmentedPicks(filters);
  const { data: profile } = useStrategyProfile();

  const minEdge = (profile?.minEdgePct ?? 0) / 100;
  const filter = (arr: typeof segments.live) => category === "potd"
    ? arr.filter(p => p.tier === "moderate" && p.edge.edge >= 0.04).slice(0, 1)
    : arr.filter(p => p.edge.edge >= minEdge);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">Oracle picks</h1>
          <Badge variant="outline">Min edge {((profile?.minEdgePct ?? 0)).toFixed(1)}%</Badge>
        </header>

        <div className="flex gap-2 overflow-x-auto -mx-3 px-3">
          {(["all", "games", "player_props", "potd"] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === c ? "bg-[hsl(var(--gold))] text-[hsl(0_0%_8%)]" : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              {c === "player_props" ? "Player props" : c === "potd" ? "Pick of the Day" : c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        <FilterChips values={SPORTS} active={sport} onChange={setSport} />
        <FilterChips values={TIERS} active={tier} onChange={setTier} />

        <Section label="Live action" picks={filter(segments.live)} loading={isLoading} />
        <Section label="Today" picks={filter(segments.today)} loading={isLoading} />
        <Section label="Upcoming (next 36h)" picks={filter(segments.upcoming)} loading={isLoading} />
        <Section label="Future" picks={filter(segments.future)} loading={isLoading} />
      </div>
    </PageTransition>
  );
}

function Section({ label, picks, loading }: { label: string; picks: ReturnType<typeof useSegmentedPicks>["segments"]["live"]; loading: boolean }) {
  if (!loading && picks.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">{label}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading && <Card><CardContent className="p-4 h-40 animate-pulse" /></Card>}
        {picks.map(p => <PickCard key={p.id} pick={p} />)}
      </div>
    </section>
  );
}
