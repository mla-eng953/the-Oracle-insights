import { useMemo } from "react";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLVBadge } from "@/components/CLVBadge";
import { useSettlements } from "@/hooks/useSettlements";
import { formatAmerican } from "@/lib/utils";
import type { SettledPick } from "@/hooks/useSettlements";

export default function Results() {
  const { data = [], isLoading } = useSettlements();

  const { core, props } = useMemo(() => {
    const core: SettledPick[] = [];
    const props: SettledPick[] = [];
    for (const row of data) {
      if (row.pick.betType === "player_prop") props.push(row);
      else core.push(row);
    }
    return { core, props };
  }, [data]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <h1 className="text-xl font-semibold">Results</h1>
        <Tabs defaultValue="core">
          <TabsList>
            <TabsTrigger value="core">Core bets</TabsTrigger>
            <TabsTrigger value="props">Player props</TabsTrigger>
          </TabsList>
          <TabsContent value="core">
            <ResultList rows={core} empty={isLoading ? "Loading…" : "No settled core bets yet."} />
          </TabsContent>
          <TabsContent value="props">
            <ResultList rows={props} empty={isLoading ? "Loading…" : "No settled props yet."} />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

function ResultList({ rows, empty }: { rows: SettledPick[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground p-2">{empty}</p>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ pick, settlement }) => (
        <Card key={pick.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{pick.sport}</Badge>
                  <Badge variant={settlement.result === "win" ? "win" : settlement.result === "loss" ? "loss" : "push"}>
                    {settlement.result.toUpperCase()}
                  </Badge>
                  <CLVBadge clv={settlement.clv} />
                </div>
                <CardTitle className="mt-1 truncate">{pick.selectionLabel}</CardTitle>
                <p className="text-xs text-muted-foreground truncate">{pick.match.awayTeam} @ {pick.match.homeTeam}</p>
              </div>
              <span className="tabular-mono text-sm font-semibold">{formatAmerican(pick.odds.americanOdds)}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {settlement.finalScore && (
              <p className="text-xs text-muted-foreground tabular-mono">
                Final: {settlement.finalScore.away} – {settlement.finalScore.home}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
