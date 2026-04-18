import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCLV } from "@/hooks/useCLV";
import { useSettlements } from "@/hooks/useSettlements";
import { CLVChart } from "@/components/CLVChart";
import { formatPct, formatUnits } from "@/lib/utils";
import { toBasisPoints } from "@/lib/clv";

type Range = "7d" | "30d" | "90d" | "all";

export default function Analytics() {
  const [range, setRange] = useState<Range>("30d");
  const { data: clv } = useCLV(range);
  const { data: settled = [] } = useSettlements();

  const settledInRange = settled;
  const wins = settledInRange.filter(s => s.settlement.result === "win").length;
  const losses = settledInRange.filter(s => s.settlement.result === "loss").length;
  const units = settledInRange.reduce((acc, s) => {
    const risk = s.pick.suggestedUnitStake;
    if (s.settlement.result === "win") {
      return acc + risk * (s.pick.odds.decimalOdds - 1);
    }
    if (s.settlement.result === "loss") return acc - risk;
    return acc;
  }, 0);
  const roi = settledInRange.length
    ? units / settledInRange.reduce((a, s) => a + s.pick.suggestedUnitStake, 0)
    : 0;

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">Analytics</h1>
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="Mean CLV" value={clv ? `${toBasisPoints(clv.summary.meanClv) >= 0 ? "+" : ""}${toBasisPoints(clv.summary.meanClv)}bp` : "—"} />
          <Metric label="Beat close %" value={clv ? formatPct(clv.summary.beatClosePct) : "—"} />
          <Metric label="t-stat" value={clv ? clv.summary.tStat.toFixed(2) : "—"} />
          <Metric label="n" value={String(clv?.summary.n ?? 0)} />
          <Metric label="Record" value={`${wins}–${losses}`} />
          <Metric label="Units" value={formatUnits(units)} />
          <Metric label="ROI" value={formatPct(roi, 1)} />
          <Metric label="Graded" value={String(settledInRange.length)} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Rolling CLV ({range})</CardTitle>
          </CardHeader>
          <CardContent>
            {clv ? <CLVChart points={clv.points} /> : null}
            <p className="text-[11px] text-muted-foreground mt-1">
              Primary edge indicator. ROI is lagging noise; CLV stabilizes ~200 picks.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="tabular-mono text-base font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
