import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatUsd } from "@/lib/utils";

interface Props {
  bankrollUsd: number;
  liveExposureUsd: number;
  maxExposurePctBankroll: number;
}

export function BankrollMeter({ bankrollUsd, liveExposureUsd, maxExposurePctBankroll }: Props) {
  const ratio = bankrollUsd > 0 ? liveExposureUsd / bankrollUsd : 0;
  const capRatio = maxExposurePctBankroll / 100;
  const overCap = ratio > capRatio;
  const pct = Math.min(100, (ratio / Math.max(capRatio, 0.0001)) * 100);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Live exposure</p>
            <p className="tabular-mono text-lg font-semibold">{formatUsd(liveExposureUsd)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bankroll</p>
            <p className="tabular-mono text-lg font-semibold">{formatUsd(bankrollUsd)}</p>
          </div>
        </div>
        <Progress value={pct} indicatorClassName={overCap ? "bg-[hsl(var(--loss))]" : "bg-[hsl(var(--gold))]"} />
        <p className="text-[10px] text-muted-foreground mt-1">
          {overCap
            ? `Over exposure cap (${maxExposurePctBankroll}%).`
            : `${Math.round(ratio * 100)}% of bankroll exposed · cap ${maxExposurePctBankroll}%`}
        </p>
      </CardContent>
    </Card>
  );
}
