import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, AlertTriangle } from "lucide-react";
import { usePicks } from "@/hooks/usePicks";
import { useStrategyProfile } from "@/hooks/useStrategyProfile";
import { simulateParlay } from "@/lib/parlay";
import { formatAmerican, formatPct, formatUsd } from "@/lib/utils";
import { kellyStake } from "@/lib/kelly";
import type { Pick } from "@/types/oracle";

const MAX_LEGS = 6;

export function ParlayBuilder() {
  const { data: pool = [] } = usePicks();
  const { data: profile } = useStrategyProfile();
  const [legs, setLegs] = useState<Pick[]>([]);

  const sim = useMemo(() => legs.length >= 2 ? simulateParlay({ picks: legs }) : null, [legs]);
  const stake = useMemo(() => {
    if (!sim || !profile) return null;
    return kellyStake({
      trueProb: sim.trueProb,
      decimalOdds: sim.combinedDecimalOdds,
      bankrollUsd: profile.bankrollUsd,
      kellyFraction: profile.kellyFraction,
      maxPerPickPctBankroll: profile.maxPerPickPctBankroll,
    }, profile.unitSizeUsd);
  }, [sim, profile]);

  function add(p: Pick) {
    if (legs.length >= MAX_LEGS) return;
    if (legs.some(l => l.id === p.id)) return;
    setLegs([...legs, p]);
  }
  function remove(id: string) { setLegs(legs.filter(l => l.id !== id)); }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader><CardTitle>Add legs</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
          {pool.map(p => {
            const inLegs = legs.some(l => l.id === p.id);
            return (
              <button
                key={p.id}
                disabled={inLegs}
                onClick={() => add(p)}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-left text-xs hover:bg-secondary/40 disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.selectionLabel}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.match.awayTeam} @ {p.match.homeTeam}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="tabular-mono">{formatAmerican(p.odds.americanOdds)}</span>
                  {inLegs ? <Badge variant="muted">in</Badge> : <Plus className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader><CardTitle>Slip ({legs.length}/{MAX_LEGS})</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {legs.length === 0 && <p className="text-xs text-muted-foreground">Pick at least two legs to simulate.</p>}
            {legs.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-xs border-b border-border pb-1.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.selectionLabel}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.match.awayTeam} @ {p.match.homeTeam} · {formatAmerican(p.odds.americanOdds)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)} aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {sim && (
          <Card>
            <CardHeader><CardTitle>Simulation</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs">
              <Row label="Combined odds" value={formatAmerican(sim.combinedAmericanOdds)} />
              <Row label="Implied prob" value={formatPct(sim.impliedProb)} />
              <Row label="True prob (Monte Carlo)" value={formatPct(sim.trueProb)} />
              <Row label="Edge" value={`${sim.edge >= 0 ? "+" : ""}${formatPct(sim.edge)}`}
                   highlight={sim.edge > 0 ? "win" : "loss"} />
              <Row label="EV per $1" value={(sim.ev).toFixed(3)} />
              <Row label="Iterations" value={sim.iterations.toLocaleString()} />
              {sim.warnings.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-[hsl(var(--gold))]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <ul className="space-y-1">{sim.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              {stake && (
                <div className="border-t border-border pt-2 flex flex-col gap-1">
                  <Row label="Suggested stake" value={formatUsd(stake.stakeUsd)} />
                  <Row label="Units" value={stake.units.toFixed(2) + "u"} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "win" | "loss" }) {
  const color = highlight === "win" ? "text-[hsl(var(--win))]" : highlight === "loss" ? "text-[hsl(var(--loss))]" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}
