import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EdgeDisplay } from "./EdgeDisplay";
import { SignalList } from "./SignalList";
import { formatAmerican } from "@/lib/utils";
import type { Pick } from "@/types/oracle";
import { Activity, Bookmark, Share2 } from "lucide-react";
import { useTrackPick } from "@/hooks/useTrackedPicks";
import { useHaptic } from "@/hooks/useHaptic";

const tierVariant: Record<string, "gold" | "muted" | "outline"> = {
  conservative: "muted",
  moderate: "outline",
  aggressive: "gold",
};

function startsIn(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (mins < 0) return "Live";
  if (mins < 60) return `In ${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `In ${h}h` : `In ${Math.round(h / 24)}d`;
}

export function PickCard({ pick, compact = false }: { pick: Pick; compact?: boolean }) {
  const track = useTrackPick();
  const haptic = useHaptic();

  const subjectLine = pick.playerName
    ? `${pick.playerName} · ${pick.playerTeam ?? ""}`
    : `${pick.match.awayTeam} @ ${pick.match.homeTeam}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant="outline" className="text-[10px]">{pick.sport}</Badge>
              <Badge variant={tierVariant[pick.tier]}>{pick.tier}</Badge>
              {pick.status === "live" && (
                <Badge variant="loss" className="animate-pulse">
                  <Activity className="h-2.5 w-2.5 mr-1" /> Live
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{subjectLine}</p>
            <p className="text-sm font-semibold truncate mt-0.5">{pick.selectionLabel}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="tabular-mono text-base font-semibold">{formatAmerican(pick.odds.americanOdds)}</p>
            <p className="text-[10px] text-muted-foreground">{startsIn(pick.match.startsAt)}</p>
          </div>
        </div>
      </CardHeader>

      {!compact && (
        <CardContent className="pt-2">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Edge</p>
              <EdgeDisplay edge={pick.edge} />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Suggested</p>
              <p className="tabular-mono text-sm font-medium">{pick.suggestedUnitStake.toFixed(2)}u</p>
            </div>
          </div>
          <div className="mb-3">
            <SignalList signals={pick.signals.slice(0, 3)} />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm" variant="gold" className="flex-1"
              onClick={() => { haptic("success"); track.mutate(pick.id); }}
              disabled={track.isPending}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Track
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/picks/${pick.id}`}>Detail</Link>
            </Button>
            <Button size="icon" variant="ghost" aria-label="Share">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
