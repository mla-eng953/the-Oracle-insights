import { useParams, Link } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { usePicks } from "@/hooks/usePicks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EdgeDisplay } from "@/components/EdgeDisplay";
import { SignalList } from "@/components/SignalList";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { formatAmerican, formatPct } from "@/lib/utils";
import { kellyStake } from "@/lib/kelly";
import { useStrategyProfile } from "@/hooks/useStrategyProfile";

export default function PickDetails() {
  const { id } = useParams();
  const { data: picks } = usePicks();
  const { data: profile } = useStrategyProfile();
  const pick = picks?.find(p => p.id === id);

  if (!pick) {
    return (
      <PageTransition>
        <div className="p-4">
          <Button asChild variant="ghost" size="sm"><Link to="/oracle"><ChevronLeft className="h-4 w-4" /> Back</Link></Button>
          <p className="text-sm text-muted-foreground mt-4">Pick not found.</p>
        </div>
      </PageTransition>
    );
  }

  const stake = profile && kellyStake({
    trueProb: pick.edge.trueProb,
    decimalOdds: pick.odds.decimalOdds,
    bankrollUsd: profile.bankrollUsd,
    kellyFraction: profile.kellyFraction,
    maxPerPickPctBankroll: profile.maxPerPickPctBankroll,
  }, profile.unitSizeUsd);

  return (
    <PageTransition>
      <div className="flex flex-col gap-3 py-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/oracle"><ChevronLeft className="h-4 w-4" /> Back</Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{pick.sport}</Badge>
              <Badge variant="gold">{pick.tier}</Badge>
              <Badge variant="muted">{pick.betType}</Badge>
            </div>
            <CardTitle className="text-lg">{pick.selectionLabel}</CardTitle>
            <p className="text-xs text-muted-foreground">{pick.match.awayTeam} @ {pick.match.homeTeam}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Odds" value={formatAmerican(pick.odds.americanOdds)} />
              <Stat label="Implied" value={formatPct(pick.odds.impliedProb)} />
              <Stat label="Model" value={formatPct(pick.edge.trueProb)} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Edge</span>
              <EdgeDisplay edge={pick.edge} size="lg" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Signals</CardTitle></CardHeader>
          <CardContent><SignalList signals={pick.signals} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Thesis</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{pick.rationaleTemplate.thesis}</p>
            <p className="text-xs text-muted-foreground mt-2">Risk: {pick.rationaleTemplate.risk}</p>
          </CardContent>
        </Card>

        {stake && (
          <Card>
            <CardHeader><CardTitle>Your suggested stake</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Kelly fraction" value={(stake.cappedFraction * 100).toFixed(2) + "%"} />
                <Stat label="Stake" value={"$" + stake.stakeUsd.toFixed(2)} />
                <Stat label="Units" value={stake.units.toFixed(2) + "u"} />
                <Stat label="To win" value={"$" + (stake.stakeUsd * (pick.odds.decimalOdds - 1)).toFixed(2)} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Based on your {(profile!.kellyFraction * 100).toFixed(0)}% Kelly and {profile!.maxPerPickPctBankroll}% per-pick cap.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
