import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { PickCard } from "@/components/PickCard";
import { useSegmentedPicks } from "@/hooks/usePicks";
import { useCLV } from "@/hooks/useCLV";
import { CLVChart } from "@/components/CLVChart";
import { NewsFeed } from "@/components/NewsFeed";
import { Activity, ArrowUpRight, Flame, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const { segments, isLoading } = useSegmentedPicks();
  const { data: clv } = useCLV("30d");

  const top = [...segments.today, ...segments.upcoming]
    .sort((a, b) => (b.edge.edge - a.edge.edge))
    .slice(0, 6);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <header>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">The Oracle sees</p>
          <h1 className="text-2xl font-semibold">Today&apos;s edge board.</h1>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <MetricTile
            label="30d CLV"
            value={clv ? `${clv.summary.meanClv >= 0 ? "+" : ""}${(clv.summary.meanClv * 10000).toFixed(0)}bp` : "—"}
            hint={clv ? `n=${clv.summary.n} · t=${clv.summary.tStat.toFixed(2)}` : ""}
          />
          <MetricTile label="Live picks" value={String(segments.live.length)} hint="Now running" />
          <MetricTile label="Edges ≥ 5%" value={String(top.filter(p => p.edge.edge >= 0.05).length)} hint="Today" />
        </section>

        {segments.live.length > 0 && (
          <section>
            <Heading icon={<Activity className="h-4 w-4 text-[hsl(var(--loss))]" />} title="Live now" link="/oracle" />
            <div className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1 snap-x snap-mandatory">
              {segments.live.map(p => (
                <div key={p.id} className="w-[82%] shrink-0 snap-start"><PickCard pick={p} compact /></div>
              ))}
            </div>
          </section>
        )}

        <section>
          <Heading icon={<Flame className="h-4 w-4 text-[hsl(var(--gold))]" />} title="Top edges" link="/oracle" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isLoading && <>
              <Card><CardContent className="p-4 h-40 animate-pulse" /></Card>
              <Card><CardContent className="p-4 h-40 animate-pulse" /></Card>
            </>}
            {top.map(p => <PickCard key={p.id} pick={p} />)}
          </div>
        </section>

        <section>
          <Heading title="Rolling CLV" link="/analytics" />
          <Card><CardContent className="p-3">{clv ? <CLVChart points={clv.points} /> : null}</CardContent></Card>
          <p className="text-[11px] text-muted-foreground mt-1">
            Positive and rising = beating the closing line. Primary edge indicator.
          </p>
        </section>

        <section>
          <Heading icon={<Newspaper className="h-4 w-4 text-muted-foreground" />} title="News" />
          <NewsFeed limit={6} />
        </section>
      </div>
    </PageTransition>
  );
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="tabular-mono text-base font-semibold mt-0.5">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Heading({ icon, title, link }: { icon?: React.ReactNode; title: string; link?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {link && <Link to={link} className="text-xs text-muted-foreground inline-flex items-center gap-1">See all <ArrowUpRight className="h-3 w-3" /></Link>}
    </div>
  );
}
